import * as cdk from 'aws-cdk-lib';
import {Template} from 'aws-cdk-lib/assertions';
import * as CdkNagExample from '../lib/cdk-nag-example-stack';

// example test. To run these tests, uncomment this file along with the
// example resource in lib/cdk-nag-example-stack.ts
let app: cdk.App, stack: cdk.Stack, template: cdk.assertions.Template;
beforeEach(() => {
  app = new cdk.App();
  stack = new CdkNagExample.CdkNagExampleStack(app, "Stack2Test");
  template = Template.fromStack(stack);
});
describe('the stack', () => {
  it('has a SQS Queue', () => {
    template.hasResource('AWS::SQS::Queue', {});
  });
  it('has a Lambda function', () => {
    template.hasResource('AWS::Lambda::Function', {});
  });
  it('has a S3 Bucket', () => {
    template.hasResource('AWS::S3::Bucket', {});
  });
})