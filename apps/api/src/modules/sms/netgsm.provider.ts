import { Logger } from '@nestjs/common';
import axios from 'axios';

export interface NetgsmConfig {
  user: string;
  pass: string;
  header: string;
}

const logger = new Logger('Netgsm');

export async function sendViaNetgsm(
  cfg: NetgsmConfig,
  phone: string,
  message: string,
): Promise<void> {
  const params = {
    usercode: cfg.user,
    password: cfg.pass,
    gsmno: phone.replace(/^\+?90/, ''),
    message,
    msgheader: cfg.header,
    encoding: 'TR',
  };
  const res = await axios.get('https://api.netgsm.com.tr/sms/send/get', {
    params,
    timeout: 15_000,
  });
  const body = String(res.data ?? '');
  const code = body.split(' ')[0];
  if (code !== '00' && code !== '01' && code !== '02') {
    throw new Error(`Netgsm hata: ${body}`);
  }
  logger.log(`Sent to ${phone} — ${body}`);
}
