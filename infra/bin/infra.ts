#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { PetServerStack } from '../lib/pet-server-stack';

const app = new App();
const stage = app.node.tryGetContext('stage') ?? 'dev';

new PetServerStack(app, `PetServer-${stage}`, {
  stage,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'ap-northeast-2',
  },
});
