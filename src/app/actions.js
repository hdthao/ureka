'use server';

import axios from 'axios';

let cachedCookies = null;
let cachedCookiesTime = 0;

async function getWebSessionCookies() {
  const now = Date.now();
  // Cache cookies for 30 minutes to optimize speed
  if (cachedCookies && (now - cachedCookiesTime < 30 * 60 * 1000)) {
    return cachedCookies;
  }

  try {
    // Step 1: GET login page to retrieve the CSRF token and initial cookies
    const loginPageRes = await axios.get('https://ssp.urekamedia.com/auth/auth/login');
    const setCookies = loginPageRes.headers['set-cookie'] || [];
    const cookiesStr = setCookies.map(c => c.split(';')[0]).join('; ');

    const match = loginPageRes.data.match(/name="csrf-token"\s+content="([^"]+)"/);
    const csrfToken = match ? match[1] : null;

    if (!csrfToken) {
      throw new Error("Unable to parse CSRF token from login page.");
    }

    // Step 2: POST credentials to obtain authenticated session cookie
    const postData = new URLSearchParams({
      _token: csrfToken,
      email: 'namtaplamai@gmail.com',
      password: 'r2d1aqww'
    }).toString();

    const loginPostRes = await axios.post('https://ssp.urekamedia.com/auth/auth/login', postData, {
      headers: {
        'Cookie': cookiesStr,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400
    });

    const authSetCookies = loginPostRes.headers['set-cookie'] || [];
    const authenticatedCookies = authSetCookies.map(c => c.split(';')[0]).join('; ');

    // Merge guest cookies and authenticated session cookies
    const cookieMap = {};
    cookiesStr.split('; ').forEach(c => {
      const [k, v] = c.split('=');
      if (k && v) cookieMap[k] = v;
    });
    if (authenticatedCookies) {
      authenticatedCookies.split('; ').forEach(c => {
        const [k, v] = c.split('=');
        if (k && v) cookieMap[k] = v;
      });
    }

    const finalCookies = Object.entries(cookieMap).map(([k, v]) => `${k}=${v}`).join('; ');
    
    cachedCookies = finalCookies;
    cachedCookiesTime = now;
    return finalCookies;
  } catch (err) {
    console.error("Error fetching web session cookies:", err.message);
    throw err;
  }
}

// Wrapper to handle automatic session cookie retry if expired or invalidated
async function fetchWithSession(url) {
  let cookies = await getWebSessionCookies();
  let response = await axios.get(url, {
    headers: { 'Cookie': cookies }
  });

  // Check if response is HTML string or missing status === true (signifying session expired or redirect to login)
  const isInvalidResponse = typeof response.data === 'string' || (response.data && response.data.status !== true);
  
  if (isInvalidResponse) {
    console.log("Session cookie expired or invalid. Re-authenticating on server...");
    // Invalidate cached cookies and force a new login
    cachedCookies = null;
    cachedCookiesTime = 0;
    cookies = await getWebSessionCookies();
    
    response = await axios.get(url, {
      headers: { 'Cookie': cookies }
    });
  }
  
  return response.data;
}

export async function loginAction(email, password) {
  try {
    const response = await axios.get('https://ssp.urekamedia.com/api/auth/login', {
      params: {
        email: email,
        password: password
      }
    });
    
    if (response.data && response.data.status && response.data.token) {
      return { success: true, token: response.data.token };
    }
    return { success: false, error: response.data.msg || 'Login failed.' };
  } catch (error) {
    console.error('Error in loginAction:', error);
    return { success: false, error: error.message || 'System error during login.' };
  }
}

export async function getReportAction(token, startDate, endDate) {
  try {
    const apiStartDate = startDate.replace(/-/g, '/');
    const apiEndDate = endDate.replace(/-/g, '/');

    const response = await axios.get('https://ssp.urekamedia.com/api/reports/get_report', {
      params: {
        start_date: apiStartDate,
        end_date: apiEndDate
      },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (response.data && response.data.data && Array.isArray(response.data.data)) {
      response.data.data = response.data.data.map(item => {
        const modified = { ...item };
        if (typeof modified.revenues === 'number') {
          modified.revenues = modified.revenues * 0.8;
        } else if (typeof modified.revenues === 'string') {
          const num = parseFloat(modified.revenues);
          if (!isNaN(num)) {
            modified.revenues = num * 0.8;
          }
        }
        if (typeof modified.vrpm === 'number') {
          modified.vrpm = modified.vrpm * 0.8;
        } else if (typeof modified.vrpm === 'string') {
          const num = parseFloat(modified.vrpm);
          if (!isNaN(num)) {
            modified.vrpm = num * 0.8;
          }
        }
        return modified;
      });
    }

    return response.data;
  } catch (error) {
    console.error('Error in getReportAction:', error);
    throw new Error(error.message || 'System error fetching report data.');
  }
}

export async function getReportsListAction() {
  try {
    return await fetchWithSession('https://ssp.urekamedia.com/auth/api/reports/reports/get_all_report_of_publisher');
  } catch (err) {
    console.error("Error in getReportsListAction:", err.message);
    return { status: false, error: err.message };
  }
}

export async function getReportDetailsAction(reportId) {
  try {
    const data = await fetchWithSession(`https://ssp.urekamedia.com/auth/api/reports/reports/get_report_data?id=${reportId}`);
    if (data && data.status) {
      if (Array.isArray(data.result)) {
        data.result = data.result.map(item => {
          const modified = { ...item };
          if (typeof modified.pub_revenues === 'number') {
            modified.pub_revenues = modified.pub_revenues * 0.8;
          } else if (typeof modified.pub_revenues === 'string') {
            const num = parseFloat(modified.pub_revenues);
            if (!isNaN(num)) {
              modified.pub_revenues = num * 0.8;
            }
          }
          if (typeof modified.vrpm === 'number') {
            modified.vrpm = modified.vrpm * 0.8;
          } else if (typeof modified.vrpm === 'string') {
            const num = parseFloat(modified.vrpm);
            if (!isNaN(num)) {
              modified.vrpm = num * 0.8;
            }
          }
          return modified;
        });
      }
      if (data.summary) {
        if (typeof data.summary.pub_revenues === 'number') {
          data.summary.pub_revenues = data.summary.pub_revenues * 0.8;
        } else if (typeof data.summary.pub_revenues === 'string') {
          const num = parseFloat(data.summary.pub_revenues);
          if (!isNaN(num)) {
            data.summary.pub_revenues = num * 0.8;
          }
        }
        if (typeof data.summary.vrpm === 'number') {
          data.summary.vrpm = data.summary.vrpm * 0.8;
        } else if (typeof data.summary.vrpm === 'string') {
          const num = parseFloat(data.summary.vrpm);
          if (!isNaN(num)) {
            data.summary.vrpm = num * 0.8;
          }
        }
      }
    }
    return data;
  } catch (err) {
    console.error("Error in getReportDetailsAction:", err.message);
    return { status: false, error: err.message };
  }
}

async function postWithSession(url, postData) {
  let cookies = await getWebSessionCookies();
  
  const getCsrf = async (cookieStr) => {
    const res = await axios.get('https://ssp.urekamedia.com/auth/reports/reports', {
      headers: { 'Cookie': cookieStr }
    });
    const match = res.data.match(/name="csrf-token"\s+content="([^"]+)"/);
    return match ? match[1] : null;
  };

  let csrfToken = await getCsrf(cookies);
  
  let response;
  try {
    response = await axios.post(url, postData, {
      headers: {
        'Cookie': cookies,
        'X-CSRF-TOKEN': csrfToken,
        'Content-Type': 'application/json'
      }
    });
  } catch (err) {
    const status = err.response ? err.response.status : 0;
    if (status === 400 || status === 419 || status === 401) {
      console.log("POST session expired or CSRF token mismatch. Re-authenticating...");
      cachedCookies = null;
      cachedCookiesTime = 0;
      cookies = await getWebSessionCookies();
      csrfToken = await getCsrf(cookies);
      response = await axios.post(url, postData, {
        headers: {
          'Cookie': cookies,
          'X-CSRF-TOKEN': csrfToken,
          'Content-Type': 'application/json'
        }
      });
    } else {
      throw err;
    }
  }
  
  return response.data;
}

export async function createReportAction(reportData) {
  try {
    return await postWithSession('https://ssp.urekamedia.com/auth/api/reports/reports/store', reportData);
  } catch (err) {
    console.error("Error in createReportAction:", err.message);
    return { status: false, error: err.message };
  }
}

export async function updateReportAction(reportData) {
  try {
    return await postWithSession('https://ssp.urekamedia.com/auth/api/reports/reports/update', reportData);
  } catch (err) {
    console.error("Error in updateReportAction:", err.message);
    return { status: false, error: err.message };
  }
}

export async function deleteReportAction(reportId) {
  try {
    return await fetchWithSession(`https://ssp.urekamedia.com/auth/api/reports/reports/delete?id=${reportId}`);
  } catch (err) {
    console.error("Error in deleteReportAction:", err.message);
    return { status: false, error: err.message };
  }
}
