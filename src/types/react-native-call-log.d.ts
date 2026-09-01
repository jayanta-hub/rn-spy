declare module 'react-native-call-log' {
  interface CallLog {
    phoneNumber: string;
    name: string;
    type: string;
    duration: number;
    timestamp: number;
  }
  interface CallLogModule {
    load: (limit: number) => Promise<CallLog[]>;
  }
  const CallLogs: CallLogModule;
  export default CallLogs;
}