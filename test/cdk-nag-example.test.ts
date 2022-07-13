import * as cdk from 'aws-cdk-lib';
import {Annotations, Match, Template} from 'aws-cdk-lib/assertions';
import * as CdkNagExample from '../lib/cdk-nag-example-stack';
import {Aspects} from 'aws-cdk-lib';
import {AwsSolutionsChecks, NagSuppressions} from 'cdk-nag';

// example test. To run these tests, uncomment this file along with the
// example resource in lib/cdk-nag-example-stack.ts
let app: cdk.App, stack: cdk.Stack, template: cdk.assertions.Template;
beforeEach(() => {
  app = new cdk.App();
  stack = new CdkNagExample.CdkNagExampleStack(app, 'Stack2Test');
  template = Template.fromStack(stack);
  Aspects.of(stack).add(new AwsSolutionsChecks());
  NagSuppressions.addStackSuppressions(stack, [
  {id: 'AwsSolutions-IAM4', reason: 'We prefer the AWS managed policies'},
  {id: 'AwsSolutions-IAM5', reason: 'We prefer the AWS managed roles'},
]);



});
describe('Compliance', () => {
  test('has no unsuppressed Warnings', () => {
    const warnings = Annotations.fromStack(stack).findWarning(
      '*',
      Match.stringLikeRegexp('AwsSolutions-.*')
    );
    expect(warnings).toHaveLength(0);
  });

  test('has no unsuppressed Errors', () => {
    const errors = Annotations.fromStack(stack).findError(
      '*',
      Match.stringLikeRegexp('AwsSolutions-.*')
    );
    expect(errors).toHaveLength(0);
  });
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
});