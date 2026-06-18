// Mock @ssut/nestjs-sqs to prevent background consumers from connecting to non-existent LocalStack/AWS
jest.mock('@ssut/nestjs-sqs', () => {
  return {
    SqsModule: {
      register: jest.fn().mockReturnValue({
        module: class DummySqsModule {},
        providers: [
          {
            provide: 'SqsService',
            useValue: {
              send: jest.fn(),
            },
          },
        ],
        exports: ['SqsService'],
      }),
      registerAsync: jest.fn().mockReturnValue({
        module: class DummySqsModule {},
        providers: [
          {
            provide: 'SqsService',
            useValue: {
              send: jest.fn(),
            },
          },
        ],
        exports: ['SqsService'],
      }),
    },
    SqsService: class DummySqsService {
      send = jest.fn();
    },
    SqsMessageHandler: () => () => {},
    SqsConsumerEventHandler: () => () => {},
  };
});
