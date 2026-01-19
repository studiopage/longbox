import { getSettings } from '@/actions/settings';

export async function sendToKapowarr(issueTitle: string, volumeName: string, year: number) {
  const settings = await getSettings();
  
  if (!settings?.kapowarr_url) {
    console.warn("⚠️ Kapowarr URL not configured. Mocking success.");
    return { success: true, ref: 'mock-ref-123' };
  }

  // REAL LOGIC (Commented out until you have Kapowarr active)
  /*
  const url = `${settings.kapowarr_url}/api/v1/wanted`;
  const payload = {
    title: issueTitle,
    series: volumeName,
    year: year
  };

  try {
     const res = await fetch(url, {
        method: 'POST',
        headers: { 
            'X-Api-Key': settings.kapowarr_key || '',
            'Content-Type': 'application/json' 
        },
        body: JSON.stringify(payload)
     });
     if (!res.ok) throw new Error('Kapowarr Error');
     const data = await res.json();
     return { success: true, ref: data.id };
  } catch (e) {
     return { success: false, error: e };
  }
  */

  return { success: true, ref: `mock-${Date.now()}` };
}

