import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

import aws_cdk as cdk

from config.loader import Config
from stacks.bandmanager_api_stack import BandmanagerApiStack


app = cdk.App()

stage = app.node.try_get_context("stage")
if not stage:
    raise ValueError("Stage is required. Pass -c stage=dev|prod")

config = Config(stage=stage)

BandmanagerApiStack(
    app,
    config.stack_name,
    config=config,
    env=cdk.Environment(
        account=config.shared.get("account") or None,
        region=config.shared["region"],
    ),
)

app.synth()
