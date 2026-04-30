import axios from 'axios';
import { Buffer } from 'buffer';
import { rewriteMaximoUrl } from '../../../shared/services/rewriteMaximoUrl';

export async function getActivities(params: any) {
  const { woHref, wonum, siteid, username, password } = params;

  let url = '';

  const select =
    'wonum,description,status,siteid,workorderid,href,woactivity{wonum,description,status,siteid,taskid,workorderid,assetnum,location,href}';

  if (woHref) {
    url = `${rewriteMaximoUrl(woHref)}?oslc.select=${select}`;
  } else {
    url =
      `http://demo2.smartech-tn.com/maximo/oslc/os/mxwo` +
      `?oslc.where=wonum="${wonum}" and siteid="${siteid}"` +
      `&oslc.select=${select}`;
  }

  console.log('📡 ACTIVITIES URL:', url);

  const auth = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');

  const response = await axios.get(url, {
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  console.log('📦 ACTIVITIES RESPONSE:', JSON.stringify(response.data, null, 2));

  const member0 = response?.data?.member?.[0];
  if (!member0) return [];

  const parentWonum = String(member0?.wonum ?? wonum ?? '').trim();
  const parentSiteid = String(member0?.siteid ?? siteid ?? '').trim();
  const parentWorkorderid = String(member0?.workorderid ?? '').trim();

  const rawActivities = member0?.woactivity ?? member0?.activities ?? [];

  return Array.isArray(rawActivities)
    ? rawActivities.map((item: any) => ({
        ...item,
        wonum: String(item?.wonum ?? '').trim(),
        siteid: String(item?.siteid ?? parentSiteid).trim(),
        parentwonum: parentWonum,
        workorderid: String(item?.workorderid ?? parentWorkorderid).trim(),
        href:
          typeof item?.href === 'string'
            ? item.href
            : item?.href?.href || item?._href || item?.['rdf:about'] || '',
      }))
    : [];
}