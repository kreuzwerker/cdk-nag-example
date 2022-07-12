#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {CdkNagExampleStack} from '../lib/cdk-nag-example-stack';
import {Aspects} from 'aws-cdk-lib';
import {AwsSolutionsChecks, HIPAASecurityChecks} from 'cdk-nag';
import {NIST80053R4Checks} from 'cdk-nag/lib/packs/nist-800-53-r4';
import {NIST80053R5Checks} from 'cdk-nag/lib/packs/nist-800-53-r5';
import {PCIDSS321Checks} from 'cdk-nag/lib/packs/pci-dss-321';

const app = new cdk.App();
const stack = new CdkNagExampleStack(app, 'CdkNagExampleStack', {});

Aspects.of(app).add(new AwsSolutionsChecks({verbose: true, logIgnores: true}));
//Aspects.of(app).add(new HIPAASecurityChecks({verbose:true, logIgnores: true}));
//Aspects.of(app).add(new NIST80053R4Checks({verbose:true, logIgnores: true}));
//Aspects.of(app).add(new NIST80053R5Checks({verbose:true, logIgnores: true}));
//Aspects.of(app).add(new PCIDSS321Checks({verbose:true, logIgnores: true}));
NagSuppressions.addStackSuppressions(stack, [
  { id: 'AwsSolutions-IAM4', reason: 'We prefer the AWS managed policies' },
  { id: 'AwsSolutions-IAM5', reason: 'We prefer the AWS managed roles' },
]);