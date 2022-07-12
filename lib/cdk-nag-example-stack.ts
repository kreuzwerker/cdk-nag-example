import {Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Queue, QueueEncryption} from 'aws-cdk-lib/aws-sqs';
import {SnsDestination} from 'aws-cdk-lib/aws-s3-notifications';
import {Bucket,BucketAccessControl, BucketEncryption, EventType} from 'aws-cdk-lib/aws-s3';
import {SqsSubscription} from 'aws-cdk-lib/aws-sns-subscriptions';
import {Topic} from 'aws-cdk-lib/aws-sns';
import {Code, Function, Runtime} from 'aws-cdk-lib/aws-lambda';
import {SqsEventSource} from 'aws-cdk-lib/aws-lambda-event-sources';
import * as iam from 'aws-cdk-lib/aws-iam';
import {PolicyStatement} from 'aws-cdk-lib/aws-iam';
import {Alias} from 'aws-cdk-lib/aws-kms';

export class CdkNagExampleStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const enforceTlsStatement = new PolicyStatement({
      sid: 'Enforce TLS for all principals',
      effect: iam.Effect.DENY,
      principals: [
        new iam.AnyPrincipal(),
      ],
      conditions: {
        'Bool': {'aws:SecureTransport': false},
      },
    });

    const uploadQueue = new Queue(this, 'UploadQueue', {
      encryption: QueueEncryption.KMS_MANAGED,
      deadLetterQueue: {
        maxReceiveCount: 5,
        queue: new Queue(this, 'UploadDLQ', {
          encryption: QueueEncryption.KMS_MANAGED
        })
      }
    });

    //The S3BucketSSLRequestsOnly.d.ts requires resources to be set, so we are adding the queues, too
    enforceTlsStatement.addResources(
      uploadQueue.queueArn,
      uploadQueue.deadLetterQueue!.queue.queueArn
    );
    enforceTlsStatement.addActions('sqs:*');
    uploadQueue.addToResourcePolicy(enforceTlsStatement);
    uploadQueue.deadLetterQueue!.queue.addToResourcePolicy(enforceTlsStatement);

    const uploadTopic = new Topic(this, 'UploadTopic', {
      masterKey: Alias.fromAliasName(this, 'SnsKey', 'aws/sns')
    });

    const sqsSubscription = new SqsSubscription(uploadQueue);
    uploadTopic.addSubscription(sqsSubscription);

    const uploadBucket = new Bucket(this, 'UploadBucket', {
      accessControl: BucketAccessControl.PUBLIC_READ_WRITE,
      serverAccessLogsPrefix: 'logs/',
      encryption: BucketEncryption.S3_MANAGED
    });

    enforceTlsStatement.addResources(
      uploadBucket.bucketArn,
      uploadBucket.arnForObjects('*')
    );

    enforceTlsStatement.addActions('s3:*');
    uploadBucket.addToResourcePolicy(enforceTlsStatement);
    uploadBucket.addEventNotification(
      EventType.OBJECT_CREATED, new SnsDestination(uploadTopic),
    );
    const uploadHandler = new Function(this, 'UploadHandler', {
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
