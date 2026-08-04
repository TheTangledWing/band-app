import hashlib
import logging
import os
import secrets
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

import boto3
from boto3.dynamodb.conditions import Key
from fastapi import Depends, FastAPI, HTTPException, Request
from mangum import Mangum
from pydantic import BaseModel, Field


logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))
logger = logging.getLogger(__name__)

TABLE_NAME = os.environ["APP_TABLE_NAME"]
APP_BASE_URL = os.environ.get("APP_BASE_URL", "")
ALLOWED_ORIGINS = set(filter(None, os.environ.get("CORS_ORIGINS", "").split(",")))

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)

app = FastAPI(title="Bandmanager API")


class BandCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    default_currency: str = Field(default="EUR", min_length=3, max_length=3)
    timezone: str = Field(default="Europe/Dublin", min_length=1, max_length=64)


class EventCreate(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    event_type: str = Field(default="gig", max_length=40)
    status: str = Field(default="scheduled", max_length=40)
    starts_at: str
    ends_at: str
    timezone: str = Field(default="Europe/Dublin", max_length=64)
    venue_name: str | None = Field(default=None, max_length=160)
    venue_address: str | None = Field(default=None, max_length=240)
    payment_amount: Decimal | None = None
    payment_currency: str = Field(default="EUR", min_length=3, max_length=3)
    payment_status: str = Field(default="unknown", max_length=40)
    payment_notes: str | None = Field(default=None, max_length=1000)
    notes: str | None = Field(default=None, max_length=4000)


class EventPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=160)
    event_type: str | None = Field(default=None, max_length=40)
    status: str | None = Field(default=None, max_length=40)
    starts_at: str | None = None
    ends_at: str | None = None
    timezone: str | None = Field(default=None, max_length=64)
    venue_name: str | None = Field(default=None, max_length=160)
    venue_address: str | None = Field(default=None, max_length=240)
    payment_amount: Decimal | None = None
    payment_currency: str | None = Field(default=None, min_length=3, max_length=3)
    payment_status: str | None = Field(default=None, max_length=40)
    payment_notes: str | None = Field(default=None, max_length=1000)
    notes: str | None = Field(default=None, max_length=4000)


class SetlistCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)


class SongCreate(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    key: str | None = Field(default=None, max_length=40)
    tempo: str | None = Field(default=None, max_length=40)
    attachment_name: str | None = Field(default=None, max_length=240)
    lyrics: str | None = Field(default=None, max_length=20000)
    setlist_id: str | None = Field(default=None, max_length=80)


class SongPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=160)
    key: str | None = Field(default=None, max_length=40)
    tempo: str | None = Field(default=None, max_length=40)
    attachment_name: str | None = Field(default=None, max_length=240)
    lyrics: str | None = Field(default=None, max_length=20000)


class SetlistSongPlayedPatch(BaseModel):
    played: bool = False


class SetlistSongReorder(BaseModel):
    song_ids: list[str] = Field(min_length=0, max_length=300)


class JoinLinkCreate(BaseModel):
    default_role: str = Field(default="member", pattern="^(manager|member|guest)$")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def claims_from_request(request: Request) -> dict[str, Any]:
    event = request.scope.get("aws.event") or {}
    authorizer = event.get("requestContext", {}).get("authorizer", {})
    claims = authorizer.get("claims") or {}
    if not claims:
        raise HTTPException(status_code=401, detail="Missing Cognito claims")
    return claims


def current_user(claims: dict[str, Any] = Depends(claims_from_request)) -> dict[str, str]:
    user_id = claims.get("sub")
    email = claims.get("email")
    if not user_id or not email:
        raise HTTPException(status_code=401, detail="Missing user identity")
    return {
        "user_id": user_id,
        "email": email,
        "name": claims.get("name") or email,
        "control_plane_tenant_id": claims.get("custom:tenant_id", ""),
        "control_plane_roles": claims.get("custom:roles", ""),
    }


def response_item(item: dict[str, Any]) -> dict[str, Any]:
    hidden = {"PK", "SK", "GSI1PK", "GSI1SK", "token_hash"}
    return {key: value for key, value in item.items() if key not in hidden}


def get_band_or_404(band_id: str) -> dict[str, Any]:
    result = table.get_item(Key={"PK": f"BAND#{band_id}", "SK": "META"})
    item = result.get("Item")
    if not item:
        raise HTTPException(status_code=404, detail="Band not found")
    return item


def get_membership(band_id: str, user_id: str) -> dict[str, Any] | None:
    result = table.get_item(Key={"PK": f"BAND#{band_id}", "SK": f"MEMBER#{user_id}"})
    return result.get("Item")


def require_member(band_id: str, user: dict[str, str]) -> dict[str, Any]:
    membership = get_membership(band_id, user["user_id"])
    if not membership or membership.get("status") != "active":
        raise HTTPException(status_code=403, detail="You are not a member of this band")
    return membership


def require_manager(band_id: str, user: dict[str, str]) -> dict[str, Any]:
    membership = require_member(band_id, user)
    if membership.get("role") not in {"owner", "manager"}:
        raise HTTPException(status_code=403, detail="Owner or manager role required")
    return membership


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    response = await call_next(request)
    origin = request.headers.get("origin", "")
    if origin in ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization,x-correlation-id"
        response.headers["Access-Control-Allow-Methods"] = "GET,POST,PATCH,OPTIONS"
    return response


@app.get("/me")
def me(user: dict[str, str] = Depends(current_user)):
    return user


@app.get("/bands")
def list_bands(user: dict[str, str] = Depends(current_user)):
    memberships = table.query(
        IndexName="GSI1",
        KeyConditionExpression=Key("GSI1PK").eq(f"USER#{user['user_id']}"),
    ).get("Items", [])

    bands = []
    for membership in memberships:
        if membership.get("entity_type") != "membership" or membership.get("status") != "active":
            continue
        band = get_band_or_404(membership["band_id"])
        band_response = response_item(band)
        band_response["role"] = membership.get("role")
        bands.append(band_response)

    return {"bands": sorted(bands, key=lambda item: item["name"].lower())}


@app.post("/bands", status_code=201)
def create_band(body: BandCreate, user: dict[str, str] = Depends(current_user)):
    band_id = str(uuid.uuid4())
    created_at = now_iso()
    band = {
        "PK": f"BAND#{band_id}",
        "SK": "META",
        "entity_type": "band",
        "band_id": band_id,
        "name": body.name.strip(),
        "default_currency": body.default_currency.upper(),
        "timezone": body.timezone,
        "control_plane_tenant_id": user["control_plane_tenant_id"],
        "created_by_user_id": user["user_id"],
        "created_at": created_at,
        "updated_at": created_at,
    }
    membership = {
        "PK": f"BAND#{band_id}",
        "SK": f"MEMBER#{user['user_id']}",
        "GSI1PK": f"USER#{user['user_id']}",
        "GSI1SK": f"BAND#{created_at}#{band_id}",
        "entity_type": "membership",
        "band_id": band_id,
        "user_id": user["user_id"],
        "email": user["email"],
        "role": "owner",
        "status": "active",
        "created_at": created_at,
        "updated_at": created_at,
    }
    table.meta.client.transact_write_items(
        TransactItems=[
            {"Put": {"TableName": TABLE_NAME, "Item": band}},
            {"Put": {"TableName": TABLE_NAME, "Item": membership}},
        ]
    )
    output = response_item(band)
    output["role"] = "owner"
    return output


@app.get("/bands/{band_id}")
def get_band(band_id: str, user: dict[str, str] = Depends(current_user)):
    membership = require_member(band_id, user)
    band = response_item(get_band_or_404(band_id))
    band["role"] = membership.get("role")
    return band


@app.post("/bands/{band_id}/join-links", status_code=201)
def create_join_link(band_id: str, body: JoinLinkCreate, user: dict[str, str] = Depends(current_user)):
    require_manager(band_id, user)
    get_band_or_404(band_id)
    token = secrets.token_urlsafe(32)
    created_at = now_iso()
    item = {
        "PK": f"JOIN#{hash_token(token)}",
        "SK": "META",
        "entity_type": "join_link",
        "band_id": band_id,
        "default_role": body.default_role,
        "created_by_user_id": user["user_id"],
        "created_at": created_at,
        "updated_at": created_at,
        "revoked_at": "",
    }
    table.put_item(Item=item)
    return {
        "token": token,
        "join_url": f"{APP_BASE_URL}/?join={token}" if APP_BASE_URL else token,
        "band_id": band_id,
        "default_role": body.default_role,
    }


@app.post("/join-links/{token}/redeem")
def redeem_join_link(token: str, user: dict[str, str] = Depends(current_user)):
    token_hash = hash_token(token)
    result = table.get_item(Key={"PK": f"JOIN#{token_hash}", "SK": "META"})
    link = result.get("Item")
    if not link or link.get("revoked_at"):
        raise HTTPException(status_code=404, detail="Join link not found")

    band = get_band_or_404(link["band_id"])
    existing = get_membership(link["band_id"], user["user_id"])
    if existing:
        return {"band": response_item(band), "membership": response_item(existing), "already_member": True}

    created_at = now_iso()
    membership = {
        "PK": f"BAND#{link['band_id']}",
        "SK": f"MEMBER#{user['user_id']}",
        "GSI1PK": f"USER#{user['user_id']}",
        "GSI1SK": f"BAND#{created_at}#{link['band_id']}",
        "entity_type": "membership",
        "band_id": link["band_id"],
        "user_id": user["user_id"],
        "email": user["email"],
        "role": link.get("default_role", "member"),
        "status": "active",
        "created_at": created_at,
        "updated_at": created_at,
    }
    table.put_item(
        Item=membership,
        ConditionExpression="attribute_not_exists(PK) AND attribute_not_exists(SK)",
    )
    return {"band": response_item(band), "membership": response_item(membership), "already_member": False}


@app.get("/bands/{band_id}/events")
def list_events(band_id: str, user: dict[str, str] = Depends(current_user)):
    require_member(band_id, user)
    result = table.query(
        KeyConditionExpression=Key("PK").eq(f"BAND#{band_id}") & Key("SK").begins_with("EVENT#")
    )
    return {"events": [response_item(item) for item in result.get("Items", [])]}


@app.post("/bands/{band_id}/events", status_code=201)
def create_event(band_id: str, body: EventCreate, user: dict[str, str] = Depends(current_user)):
    require_member(band_id, user)
    get_band_or_404(band_id)
    event_id = str(uuid.uuid4())
    created_at = now_iso()
    item = {
        "PK": f"BAND#{band_id}",
        "SK": f"EVENT#{body.starts_at}#{event_id}",
        "entity_type": "event",
        "event_id": event_id,
        "band_id": band_id,
        "title": body.title.strip(),
        "event_type": body.event_type,
        "status": body.status,
        "starts_at": body.starts_at,
        "ends_at": body.ends_at,
        "timezone": body.timezone,
        "venue_name": body.venue_name or "",
        "venue_address": body.venue_address or "",
        "payment_amount": body.payment_amount,
        "payment_currency": body.payment_currency.upper(),
        "payment_status": body.payment_status,
        "payment_notes": body.payment_notes or "",
        "notes": body.notes or "",
        "created_by_user_id": user["user_id"],
        "updated_by_user_id": user["user_id"],
        "created_at": created_at,
        "updated_at": created_at,
    }
    table.put_item(Item=item)
    return response_item(item)


def find_event(band_id: str, event_id: str) -> dict[str, Any]:
    result = table.query(
        KeyConditionExpression=Key("PK").eq(f"BAND#{band_id}") & Key("SK").begins_with("EVENT#")
    )
    for item in result.get("Items", []):
        if item.get("event_id") == event_id:
            return item
    raise HTTPException(status_code=404, detail="Event not found")


def find_song(band_id: str, song_id: str) -> dict[str, Any]:
    result = table.get_item(Key={"PK": f"BAND#{band_id}", "SK": f"SONG#{song_id}"})
    item = result.get("Item")
    if not item:
      raise HTTPException(status_code=404, detail="Song not found")
    return item


def find_setlist(band_id: str, setlist_id: str) -> dict[str, Any]:
    result = table.get_item(Key={"PK": f"BAND#{band_id}", "SK": f"SETLIST#{setlist_id}"})
    item = result.get("Item")
    if not item:
      raise HTTPException(status_code=404, detail="Setlist not found")
    return item


def setlist_song_links(band_id: str, setlist_id: str) -> list[dict[str, Any]]:
    return table.query(
        KeyConditionExpression=Key("PK").eq(f"BAND#{band_id}") & Key("SK").begins_with(f"SETLISTSONG#{setlist_id}#")
    ).get("Items", [])


def find_setlist_song_link(band_id: str, setlist_id: str, song_id: str) -> dict[str, Any]:
    for item in setlist_song_links(band_id, setlist_id):
        if item.get("song_id") == song_id:
            return item
    raise HTTPException(status_code=404, detail="Song is not in this setlist")


@app.patch("/bands/{band_id}/events/{event_id}")
def update_event(band_id: str, event_id: str, body: EventPatch, user: dict[str, str] = Depends(current_user)):
    require_member(band_id, user)
    item = find_event(band_id, event_id)
    updates = body.model_dump(exclude_unset=True)
    for key, value in updates.items():
        if key in {"payment_currency"} and isinstance(value, str):
            value = value.upper()
        item[key] = value if value is not None else ""
    item["updated_by_user_id"] = user["user_id"]
    item["updated_at"] = now_iso()

    if "starts_at" in updates:
        table.delete_item(Key={"PK": item["PK"], "SK": item["SK"]})
        item["SK"] = f"EVENT#{item['starts_at']}#{event_id}"
    table.put_item(Item=item)
    return response_item(item)


@app.get("/bands/{band_id}/setlists")
def list_setlists(band_id: str, user: dict[str, str] = Depends(current_user)):
    require_member(band_id, user)
    result = table.query(
        KeyConditionExpression=Key("PK").eq(f"BAND#{band_id}") & Key("SK").begins_with("SETLIST#")
    )
    setlists = [response_item(item) for item in result.get("Items", [])]
    links_result = table.query(
        KeyConditionExpression=Key("PK").eq(f"BAND#{band_id}") & Key("SK").begins_with("SETLISTSONG#")
    )
    setlist_songs = [response_item(item) for item in links_result.get("Items", [])]
    songs_result = table.query(
        KeyConditionExpression=Key("PK").eq(f"BAND#{band_id}") & Key("SK").begins_with("SONG#")
    )
    songs = [response_item(item) for item in songs_result.get("Items", [])]
    return {
        "setlists": sorted(setlists, key=lambda item: item.get("created_at", "")),
        "songs": sorted(songs, key=lambda item: item.get("title", "").lower()),
        "setlist_songs": sorted(setlist_songs, key=lambda item: (item.get("setlist_id", ""), item.get("order", 0))),
    }


@app.post("/bands/{band_id}/setlists", status_code=201)
def create_setlist(band_id: str, body: SetlistCreate, user: dict[str, str] = Depends(current_user)):
    require_member(band_id, user)
    get_band_or_404(band_id)
    setlist_id = str(uuid.uuid4())
    created_at = now_iso()
    item = {
        "PK": f"BAND#{band_id}",
        "SK": f"SETLIST#{setlist_id}",
        "entity_type": "setlist",
        "setlist_id": setlist_id,
        "band_id": band_id,
        "name": body.name.strip(),
        "created_by_user_id": user["user_id"],
        "updated_by_user_id": user["user_id"],
        "created_at": created_at,
        "updated_at": created_at,
    }
    table.put_item(Item=item)
    return response_item(item)


@app.post("/bands/{band_id}/setlists/{setlist_id}/delete")
def delete_setlist(band_id: str, setlist_id: str, user: dict[str, str] = Depends(current_user)):
    require_member(band_id, user)
    item = find_setlist(band_id, setlist_id)
    links = setlist_song_links(band_id, setlist_id)
    table.delete_item(Key={"PK": item["PK"], "SK": item["SK"]})
    with table.batch_writer() as batch:
        for link in links:
            batch.delete_item(Key={"PK": link["PK"], "SK": link["SK"]})
    return {"deleted": True, "setlist_id": setlist_id}


@app.post("/bands/{band_id}/songs", status_code=201)
def create_song(band_id: str, body: SongCreate, user: dict[str, str] = Depends(current_user)):
    require_member(band_id, user)
    get_band_or_404(band_id)
    song_id = str(uuid.uuid4())
    created_at = now_iso()
    song = {
        "PK": f"BAND#{band_id}",
        "SK": f"SONG#{song_id}",
        "entity_type": "song",
        "song_id": song_id,
        "band_id": band_id,
        "title": body.title.strip(),
        "key": body.key or "",
        "tempo": body.tempo or "",
        "attachment_name": body.attachment_name or "",
        "lyrics": body.lyrics or "",
        "created_by_user_id": user["user_id"],
        "updated_by_user_id": user["user_id"],
        "created_at": created_at,
        "updated_at": created_at,
    }
    transact_items = [{"Put": {"TableName": TABLE_NAME, "Item": song}}]
    if body.setlist_id:
        find_setlist(band_id, body.setlist_id)
        links = table.query(
            KeyConditionExpression=Key("PK").eq(f"BAND#{band_id}") & Key("SK").begins_with(f"SETLISTSONG#{body.setlist_id}#")
        ).get("Items", [])
        order = len(links) + 1
        link = {
            "PK": f"BAND#{band_id}",
            "SK": f"SETLISTSONG#{body.setlist_id}#{order:04d}#{song_id}",
            "entity_type": "setlist_song",
            "band_id": band_id,
            "setlist_id": body.setlist_id,
            "song_id": song_id,
            "order": order,
            "created_by_user_id": user["user_id"],
            "created_at": created_at,
        }
        transact_items.append({"Put": {"TableName": TABLE_NAME, "Item": link}})
    table.meta.client.transact_write_items(TransactItems=transact_items)
    return response_item(song)


@app.patch("/bands/{band_id}/songs/{song_id}")
def update_song(band_id: str, song_id: str, body: SongPatch, user: dict[str, str] = Depends(current_user)):
    require_member(band_id, user)
    item = find_song(band_id, song_id)
    updates = body.model_dump(exclude_unset=True)
    for key, value in updates.items():
        item[key] = value if value is not None else ""
    item["updated_by_user_id"] = user["user_id"]
    item["updated_at"] = now_iso()
    table.put_item(Item=item)
    return response_item(item)


@app.post("/bands/{band_id}/setlists/{setlist_id}/songs/{song_id}/played")
def mark_setlist_song_played(
    band_id: str,
    setlist_id: str,
    song_id: str,
    body: SetlistSongPlayedPatch,
    user: dict[str, str] = Depends(current_user),
):
    require_member(band_id, user)
    find_setlist(band_id, setlist_id)
    find_song(band_id, song_id)
    item = find_setlist_song_link(band_id, setlist_id, song_id)
    item["played_at"] = now_iso() if body.played else ""
    item["updated_by_user_id"] = user["user_id"]
    item["updated_at"] = now_iso()
    table.put_item(Item=item)
    return response_item(item)


@app.post("/bands/{band_id}/setlists/{setlist_id}/songs/{song_id}/remove")
def remove_setlist_song(
    band_id: str,
    setlist_id: str,
    song_id: str,
    user: dict[str, str] = Depends(current_user),
):
    require_member(band_id, user)
    find_setlist(band_id, setlist_id)
    item = find_setlist_song_link(band_id, setlist_id, song_id)
    table.delete_item(Key={"PK": item["PK"], "SK": item["SK"]})
    remaining = sorted(
        [link for link in setlist_song_links(band_id, setlist_id) if link.get("song_id") != song_id],
        key=lambda link: link.get("order", 0),
    )
    write_setlist_song_order(band_id, setlist_id, [link["song_id"] for link in remaining], user["user_id"], remaining)
    return {"removed": True, "setlist_id": setlist_id, "song_id": song_id}


@app.post("/bands/{band_id}/setlists/{setlist_id}/songs/reorder")
def reorder_setlist_songs(
    band_id: str,
    setlist_id: str,
    body: SetlistSongReorder,
    user: dict[str, str] = Depends(current_user),
):
    require_member(band_id, user)
    find_setlist(band_id, setlist_id)
    existing = setlist_song_links(band_id, setlist_id)
    existing_song_ids = {link["song_id"] for link in existing}
    if set(body.song_ids) != existing_song_ids or len(body.song_ids) != len(existing_song_ids):
        raise HTTPException(status_code=400, detail="Song order must include every song in the setlist once")
    write_setlist_song_order(band_id, setlist_id, body.song_ids, user["user_id"], existing)
    return {"setlist_id": setlist_id, "song_ids": body.song_ids}


def write_setlist_song_order(
    band_id: str,
    setlist_id: str,
    song_ids: list[str],
    user_id: str,
    existing_links: list[dict[str, Any]],
) -> None:
    existing_by_song_id = {link["song_id"]: link for link in existing_links}
    timestamp = now_iso()
    with table.batch_writer() as batch:
        for index, song_id in enumerate(song_ids, start=1):
            previous = existing_by_song_id[song_id]
            item = {
                **previous,
                "order": index,
                "updated_by_user_id": user_id,
                "updated_at": timestamp,
            }
            batch.put_item(Item=item)


@app.post("/bands/{band_id}/events/{event_id}/cancel")
def cancel_event(band_id: str, event_id: str, user: dict[str, str] = Depends(current_user)):
    require_member(band_id, user)
    item = find_event(band_id, event_id)
    item["status"] = "cancelled"
    item["cancelled_at"] = now_iso()
    item["updated_by_user_id"] = user["user_id"]
    item["updated_at"] = now_iso()
    table.put_item(Item=item)
    return response_item(item)


handler = Mangum(app, lifespan="off")
