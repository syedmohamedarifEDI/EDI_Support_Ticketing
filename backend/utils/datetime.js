const moment = require('moment-timezone');

const IST_TZ = 'Asia/Kolkata';
const DT_FORMAT = 'YYYY-MM-DD HH:mm:ss';

/**
 * Validates a datetime string matches YYYY-MM-DD HH:mm:ss exactly
 */
const isValidDateTimeFormat = (value) => {
  if (!value || typeof value !== 'string') return false;
  return moment(value, DT_FORMAT, true).isValid();
};

/**
 * Returns current IST datetime as a formatted string
 */
const nowIST = () => {
  return moment().tz(IST_TZ).format(DT_FORMAT);
};

module.exports = { isValidDateTimeFormat, nowIST, IST_TZ, DT_FORMAT };
