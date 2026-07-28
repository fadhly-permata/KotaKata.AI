import { logger } from "react-native-logs";

const log = logger.createLogger({
  severity: __DEV__ ? "debug" : "error",
});

export const loggerDebug = log.debug;
export const loggerInfo = log.info;
export const loggerWarn = log.warn;
export const loggerError = log.error;

export default log;
