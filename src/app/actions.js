'use server';

import axios from 'axios';

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
