import {Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Queue} from 'aws-cdk-lib/aws-sqs';
import {SnsDestination} from 'aws-cdk-lib/aws-s3-notifications';
import {Bucket, BucketAccessControl, EventType} from 'aws-cdk-lib/aws-s3';
import {SqsSubscription} from 'aws-cdk-lib/aws-sns-subscriptions';
import {Topic} from 'aws-cdk-lib/aws-sns';
import {Code, Function, Runtime} from 'aws-cdk-lib/aws-lambda';
import {SqsEventSource} from 'aws-cdk-lib/aws-lambda-event-sources';

export class CdkNagExampleStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);


    const uploadQueue = new Queue(this, "UploadQueue", {
      encryption: QueueEncryption.KMS_MANAGED,
      deadLetterQueue: {
        maxReceiveCount: 5,
        queue: new Queue(this,"UploadDLQ", {
          encryption: QueueEncryption.KMS_MANAGED
        })
      }
    });

    const enforceTlsStatement = new PolicyStatement({
      sid: "Enforce TLS for all principals",
      effect: iam.Effect.DENY,
      principals: [
        new iam.AnyPrincipal(),
      ],
      actions: [
        "sqs:*",
        "sns:publish"
      ],
      conditions: {
        "Bool": {"aws:SecureTransport": false},
      },
    }  );
    uploadQueue.addToResourcePolicy(enforceTlsStatement);
    uploadQueue.deadLetterQueue?.queue.addToResourcePolicy(enforceTlsStatement);

    const uploadTopic = new Topic(this, "UploadTopic", {
      masterKey: Alias.fromAliasName(this, "SnsKey", "aws/sns")
    });

    const sqsSubscription = new SqsSubscription(uploadQueue);
    uploadTopic.addSubscription(sqsSubscription);
    const uploadBucket = new Bucket(this, 'UploadBucket', {
      accessControl: BucketAccessControl.PUBLIC_READ_WRITE,
    });
    uploadBucket.addEventNotification(
      EventType.OBJECT_CREATED, new SnsDestination(uploadTopic),
    );
    const uploadHandler = new Function(this, "UploadHandler", {
      runtime: Runtime.NODEJS_16_X,
      code: Code.fromInline(`
        exports.handler = async (event) => {
          console.log("event: ", event)
        };
      `),
      handler: 'index.handler',
    });
    uploadHandler.addEventSource(new SqsEventSource(uploadQueue));

  }
}
