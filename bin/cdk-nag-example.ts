#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {CdkNagExampleStack} from '../lib/cdk-nag-example-stack';

const app = new cdk.App();
new CdkNagExampleStack(app, 'CdkNagExampleStack', {});