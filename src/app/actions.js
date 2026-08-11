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
    return { success: false, error: response.data.msg || 'Đăng nhập thất bại.' };
  } catch (error) {
    console.error('Error in loginAction:', error);
    return { success: false, error: error.message || 'Lỗi hệ thống khi đăng nhập.' };
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

    return response.data;
  } catch (error) {
    console.error('Error in getReportAction:', error);
    throw new Error(error.message || 'Lỗi hệ thống khi lấy dữ liệu báo cáo.');
  }
}

export async function getReportsListAction() {
  try {
    const cookies = await getWebSessionCookies();
    const response = await axios.get('https://ssp.urekamedia.com/auth/api/reports/reports/get_all_report_of_publisher', {
      headers: {
        'Cookie': cookies
      }
    });
    return response.data;
  } catch (err) {
    console.error("Error in getReportsListAction:", err.message);
    return { status: false, error: err.message };
  }
}

export async function getReportDetailsAction(reportId) {
  try {
    const cookies = await getWebSessionCookies();
    const response = await axios.get(`https://ssp.urekamedia.com/auth/api/reports/reports/get_report_data?id=${reportId}`, {
      headers: {
        'Cookie': cookies
      }
    });
    return response.data;
  } catch (err) {
    console.error("Error in getReportDetailsAction:", err.message);
    return { status: false, error: err.message };
  }
}
