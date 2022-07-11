import {Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Queue} from 'aws-cdk-lib/aws-sqs';
import {SnsDestination} from 'aws-cdk-lib/aws-s3-notifications';
import {Bucket, EventType} from "aws-cdk-lib/aws-s3";
import {SqsSubscription} from "aws-cdk-lib/aws-sns-subscriptions";
import {Topic} from "aws-cdk-lib/aws-sns";
import {Code, Function, Runtime} from 'aws-cdk-lib/aws-lambda';
import {SqsEventSource} from "aws-cdk-lib/aws-lambda-event-sources";

export class CdkNagExampleStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const uploadQueue = new Queue(this, 'UploadQueue');
    const sqsSubscription = new SqsSubscription(uploadQueue);
    const uploadTopic = new Topic(this, 'UploadTopic');
    uploadTopic.addSubscription(sqsSubscription);
    const uploadBucket = new Bucket(this, "UploadBucket");
    uploadBucket.addEventNotification(
      EventType.OBJECT_CREATED, new SnsDestination(uploadTopic),
    );
    const uploadHandler = new Function(this, 'UploadHandler', {
      runtime: Runtime.NODEJS_16_X,
      code:  Code.fromInline(`
        exports.handler = async (event) => {
          console.log('event: ', event)
        };
      `),
      handler: "index.handler",
    });
    uploadHandler.addEventSource(new SqsEventSource(uploadQueue));

  }
}
