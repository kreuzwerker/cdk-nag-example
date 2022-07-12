import {RemovalPolicy, Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Queue, QueueEncryption} from 'aws-cdk-lib/aws-sqs';
import {SnsDestination} from 'aws-cdk-lib/aws-s3-notifications';
import {Bucket, BucketAccessControl, BucketEncryption, EventType} from 'aws-cdk-lib/aws-s3';
import {SqsSubscription} from 'aws-cdk-lib/aws-sns-subscriptions';
import {Topic} from 'aws-cdk-lib/aws-sns';
import {Code, Function, Runtime} from 'aws-cdk-lib/aws-lambda';
import {SqsEventSource} from 'aws-cdk-lib/aws-lambda-event-sources';
import * as iam from 'aws-cdk-lib/aws-iam';
import {PolicyStatement, ServicePrincipal} from 'aws-cdk-lib/aws-iam';
import {Key} from 'aws-cdk-lib/aws-kms';
import {NagSuppressions} from 'cdk-nag';

export class CdkNagExampleStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const sqsKey = new Key(this, 'SQSKey', {
      removalPolicy: RemovalPolicy.DESTROY,
      enableKeyRotation: true,
    });
    sqsKey.grant(new ServicePrincipal(ServicePrincipal.servicePrincipalName('s3.amazonaws.com')), 'kms:Decrypt', 'kms:GenerateDataKey*');

    const uploadQueue = new Queue(this, 'UploadQueue', {
      encryption: QueueEncryption.KMS,
      encryptionMasterKey: sqsKey,
      deadLetterQueue: {
        maxReceiveCount: 5,
        queue: new Queue(this, 'UploadDLQ', {
          encryption: QueueEncryption.KMS,
          encryptionMasterKey: sqsKey
        })
      }
    });
    NagSuppressions.addResourceSuppressionsByPath(
      this,
      '/CdkNagExampleStack/UploadDLQ/Resource', [
        {
          id: 'AwsSolutions-SQS3',
          reason: 'this IS a deadletter queue'
        }
      ]
    );

    const uploadTopic = new Topic(this, 'UploadTopic', {
      masterKey: sqsKey
    });

    const enforceTlsStatement = new PolicyStatement({
      sid: 'Enforce TLS for all principals',
      effect: iam.Effect.DENY,
      principals: [
        new iam.AnyPrincipal(),
      ],
      conditions: {
        'Bool': {'aws:SecureTransport': false},
      },
      actions: ['sqs:*'],
    });

    uploadQueue.addToResourcePolicy(enforceTlsStatement.copy({
      resources: [uploadQueue.queueArn]
    }));
    uploadQueue.deadLetterQueue!.queue.addToResourcePolicy(enforceTlsStatement.copy({
      resources: [uploadQueue.deadLetterQueue!.queue.queueArn]
    }));



    const sqsSubscription = new SqsSubscription(uploadQueue);
    uploadTopic.addSubscription(sqsSubscription);

    const uploadBucket = new Bucket(this, 'UploadBucket', {
      accessControl: BucketAccessControl.PUBLIC_READ_WRITE,
      serverAccessLogsPrefix: 'logs/',
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true
    });

    uploadBucket.addEventNotification(
      EventType.OBJECT_CREATED, new SnsDestination(uploadTopic),
    );

    NagSuppressions.addResourceSuppressions(
      uploadBucket,
      [{id: 'AwsSolutions-S2', reason: 'This bucket is meant to be public'}]
    );
    const uploadHandler = new Function(this, 'UploadHandler', {
      runtime: Runtime.NODEJS_16_X,
      code: Code.fromInline(`
        exports.handler = async (event) => {
          console.log('event: ', event)
        };
      `),
      handler: 'index.handler',
    });
    uploadHandler.addEventSource(new SqsEventSource(uploadQueue));

  }
}
