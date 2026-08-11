import axios from 'axios';

async function testApi() {
  try {
    const loginRes = await axios.get('https://ssp.urekamedia.com/api/auth/login', {
      params: { email: 'namtaplamai@gmail.com', password: 'r2d1aqww' }
    });
    const token = loginRes.data.token;
    console.log('Got token:', token ? 'yes' : 'no');
    
    const reportRes = await axios.get('https://ssp.urekamedia.com/api/reports/get_report', {
      params: { start_date: '2026/08/04', end_date: '2026/08/11' },
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Report keys:', Object.keys(reportRes.data));
    if (reportRes.data.data && Array.isArray(reportRes.data.data)) {
        const dates = reportRes.data.data.map(item => item.date);
        const uniqueDates = [...new Set(dates)];
        console.log('Unique dates in API response:', uniqueDates);
    } else {
        console.log('No array data found');
    }
  } catch (err) {
    console.error(err.message);
  }
}

testApi();
