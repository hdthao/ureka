'use server';

import axios from 'axios';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { subDays, format } from 'date-fns';
import { connectDB } from '../lib/db';
import User from '../models/User';
import Report from '../models/Report';

const JWT_SECRET = process.env.JWT_SECRET || 'ureka_super_secret_key_123';

const SITE_CATALOG = [
  { id: 106083, name: 'news.pioneerindiya.com' },
  { id: 106095, name: 'feel.pioneerindiya.com' }
];

const SITE_NAME_BY_ID = SITE_CATALOG.reduce((map, site) => {
  map[site.id] = site.name;
  return map;
}, {});

// Cache for Ureka SSP API credentials session
let cachedSSPToken = null;
let cachedSSPTokenTime = 0;

// Helper: Get shared Ureka SSP API token
async function getSSPToken() {
  const now = Date.now();
  // Cache SSP token for 1 hour
  if (cachedSSPToken && (now - cachedSSPTokenTime < 1000 * 60 * 60)) {
    return cachedSSPToken;
  }

  console.log('Logging in to Ureka SSP with shared publisher account...');
  try {
    const response = await axios.get('https://ssp.urekamedia.com/api/auth/login', {
      params: {
        email: 'namtaplamai@gmail.com',
        password: 'r2d1aqww'
      }
    });

    if (response.data && response.data.status && response.data.token) {
      cachedSSPToken = response.data.token;
      cachedSSPTokenTime = now;
      return cachedSSPToken;
    }
    throw new Error(response.data?.msg || 'Authentication failed');
  } catch (err) {
    console.error('Error logging in to Ureka SSP:', err.message);
    throw new Error('Failed to authenticate with Ureka SSP: ' + err.message);
  }
}

// Helpers: Local JWT Token implementation using native Node.js crypto
function generateLocalToken(userId, email) {
  const payload = JSON.stringify({ userId, email, exp: Date.now() + 1000 * 60 * 60 * 24 * 7 });
  const hmac = crypto.createHmac('sha256', JWT_SECRET);
  hmac.update(payload);
  const signature = hmac.digest('hex');
  return Buffer.from(payload).toString('base64') + '.' + signature;
}

// Helper: Get current local logged-in user ID
async function getCurrentUserId() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('local_user_id')?.value;
  if (!userId) {
    throw new Error('Unauthorized');
  }
  return userId;
}

async function getCurrentUser() {
  const userId = await getCurrentUserId();
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

function getAllowedSiteIds(user) {
  const validSiteIds = new Set(SITE_CATALOG.map(site => site.id));
  return (user.allowedSites || []).filter(siteId => validSiteIds.has(siteId));
}

function sanitizeReportFilters(filters, allowedSiteIds) {
  const requestedSiteIds = Array.isArray(filters) ? filters.map(Number).filter(Boolean) : [];
  const allowedSet = new Set(allowedSiteIds);
  const sanitized = requestedSiteIds.filter(siteId => allowedSet.has(siteId));
  return sanitized.length > 0 ? sanitized : allowedSiteIds;
}

function filterRecordsBySiteIds(records, siteIds) {
  const allowedSiteNames = siteIds.map(id => SITE_NAME_BY_ID[id]).filter(Boolean);
  return records.filter(record => allowedSiteNames.includes(record.sites_name));
}

export async function getAllowedSitesAction() {
  try {
    await connectDB();
    const user = await getCurrentUser();
    const allowedSiteIds = getAllowedSiteIds(user);
    const sites = SITE_CATALOG.filter(site => allowedSiteIds.includes(site.id));
    return { status: true, sites };
  } catch (err) {
    console.error("Error in getAllowedSitesAction:", err.message);
    return { status: false, error: err.message === 'Unauthorized' ? 'Session expired. Please log in again.' : err.message };
  }
}

// Server Action: Local Login
export async function loginAction(email, password) {
  try {
    await connectDB();
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return { success: false, error: 'Invalid email or password.' };
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return { success: false, error: 'Invalid email or password.' };
    }

    // Set cookie session
    const cookieStore = await cookies();
    cookieStore.set('local_user_id', user._id.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/'
    });

    const token = generateLocalToken(user._id.toString(), user.email);
    return { success: true, token };
  } catch (err) {
    console.error('Error in loginAction:', err);
    return { success: false, error: err.message || 'System error during login.' };
  }
}

// Server Action: Local Logout
export async function logoutAction() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('local_user_id');
    return { success: true };
  } catch (err) {
    console.error('Error in logoutAction:', err);
    return { success: false, error: err.message || 'System error during logout.' };
  }
}

// Server Action: Fetch raw performance report from SSP (reduced by 20%)
export async function getReportAction(token, startDate, endDate) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    const allowedSiteIds = getAllowedSiteIds(user);
    const apiStartDate = startDate.replace(/-/g, '/');
    const apiEndDate = endDate.replace(/-/g, '/');

    const sspToken = await getSSPToken();

    const response = await axios.get('https://ssp.urekamedia.com/api/reports/get_report', {
      params: {
        start_date: apiStartDate,
        end_date: apiEndDate
      },
      headers: {
        Authorization: `Bearer ${sspToken}`
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
      response.data.data = filterRecordsBySiteIds(response.data.data, allowedSiteIds);
    }

    return response.data;
  } catch (error) {
    console.error('Error in getReportAction:', error);
    throw new Error(error.message || 'System error fetching report data.');
  }
}

// Server Action: CRUD - Get all reports of the logged-in local user
export async function getReportsListAction() {
  try {
    await connectDB();
    const user = await getCurrentUser();
    const userId = user._id;
    const allowedSiteIds = getAllowedSiteIds(user);
    
    const list = await Report.find({ userId }).sort({ createdAt: -1 });
    
    // Map _id to id for frontend compatibility
    const mappedList = list.map(item => ({
      id: item._id.toString(),
      name: item.name,
      description: item.description,
      date_range_type: item.date_range_type,
      date_dynamic: item.date_dynamic,
      start_date: item.start_date,
      end_date: item.end_date,
      dimensions: item.dimensions,
      metrics: item.metrics,
      filters: sanitizeReportFilters(item.filters, allowedSiteIds),
      status: item.status
    }));

    return { status: true, list: mappedList };
  } catch (err) {
    console.error("Error in getReportsListAction:", err.message);
    return { status: false, error: err.message === 'Unauthorized' ? 'Session expired. Please log in again.' : err.message };
  }
}

// Helper: Resolve dynamic date ranges
function resolveDateRange(report) {
  let startStr, endStr;
  const today = new Date();
  
  if (report.date_range_type === 'dynamic') {
    if (report.date_dynamic === 'today') {
      startStr = format(today, 'yyyy/MM/dd');
      endStr = format(today, 'yyyy/MM/dd');
    } else if (report.date_dynamic === 'yesterday') {
      const yest = subDays(today, 1);
      startStr = format(yest, 'yyyy/MM/dd');
      endStr = format(yest, 'yyyy/MM/dd');
    } else if (report.date_dynamic === 'last7days') {
      const start = subDays(today, 7);
      const end = subDays(today, 1);
      startStr = format(start, 'yyyy/MM/dd');
      endStr = format(end, 'yyyy/MM/dd');
    } else { // last30days
      const start = subDays(today, 30);
      const end = subDays(today, 1);
      startStr = format(start, 'yyyy/MM/dd');
      endStr = format(end, 'yyyy/MM/dd');
    }
  } else {
    startStr = report.start_date;
    endStr = report.end_date;
  }
  return { startStr, endStr };
}

function getRecordInventory(record) {
  return Number(record.impressions_dfp ?? record.inventory ?? record.impressions ?? 0);
}

// Server Action: Get report data (with aggregation/grouping logic based on dimensions)
export async function getReportDetailsAction(reportId) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    const userId = user._id;
    const allowedSiteIds = getAllowedSiteIds(user);

    const report = await Report.findOne({ _id: reportId, userId });
    if (!report) {
      return { status: false, error: 'Report configuration not found.' };
    }

    const { startStr, endStr } = resolveDateRange(report);

    const sspToken = await getSSPToken();
    const sspData = await getReportAction(sspToken, startStr.replace(/\//g, '-'), endStr.replace(/\//g, '-'));

    if (!sspData || !sspData.data || !Array.isArray(sspData.data)) {
      return { status: false, error: 'No data returned from SSP.' };
    }

    // Filter by website ID
    const effectiveSiteIds = sanitizeReportFilters(report.filters, allowedSiteIds);
    const allowedSiteNames = effectiveSiteIds.map(id => SITE_NAME_BY_ID[id]).filter(Boolean);
    const filteredRecords = sspData.data.filter(rec => allowedSiteNames.includes(rec.sites_name));

    const dims = report.dimensions;
    const mets = report.metrics;
    const grouped = {};

    for (const rec of filteredRecords) {
      const keyParts = dims.map(d => {
        if (d === 'sites') return rec.sites_name || '-';
        if (d === 'adunits') return rec.adunits_name || '-';
        if (d === 'formats') return rec.formats || (rec.adunits_name ? rec.adunits_name.split('_')[0] : '-');
        return rec[d] || '-';
      });
      const groupKey = keyParts.join('|||');

      if (!grouped[groupKey]) {
        grouped[groupKey] = {};
        dims.forEach((d, idx) => {
          if (d === 'sites') {
            grouped[groupKey].sites_name = keyParts[idx];
          } else if (d === 'adunits') {
            grouped[groupKey].adunits_name = keyParts[idx];
          } else if (d === 'formats') {
            grouped[groupKey].formats = keyParts[idx];
          } else {
            grouped[groupKey][d] = keyParts[idx];
          }
        });
        mets.forEach(m => {
          grouped[groupKey][m] = 0;
        });
        grouped[groupKey].__pageviewKeys = new Set();
        grouped[groupKey].__pageviewForVrpm = 0;
      }

      const pageviewKey = `${rec.sites_name || '-'}|||${rec.date || '-'}`;
      if (!grouped[groupKey].__pageviewKeys.has(pageviewKey)) {
        const pageview = Number(rec.pageview || 0);
        grouped[groupKey].__pageviewKeys.add(pageviewKey);
        grouped[groupKey].__pageviewForVrpm += pageview;
        if (mets.includes('pageview')) {
          grouped[groupKey].pageview += pageview;
        }
      }

      mets.forEach(m => {
        if (m === 'impressions_dfp') {
          grouped[groupKey][m] += getRecordInventory(rec);
        } else if (m === 'pub_revenues') {
          grouped[groupKey][m] += Number(rec.revenues || rec.pub_revenues || 0);
        }
      });
    }

    let totalPageviewForVrpm = 0;
    const result = Object.values(grouped).map(item => {
      const pageviewForVrpm = item.__pageviewForVrpm || 0;
      totalPageviewForVrpm += pageviewForVrpm;
      const visibleItem = { ...item };
      delete visibleItem.__pageviewKeys;
      delete visibleItem.__pageviewForVrpm;
      if (mets.includes('vrpm')) {
        const rev = visibleItem.pub_revenues || 0;
        visibleItem.vrpm = pageviewForVrpm > 0 ? (rev / pageviewForVrpm) * 1000 : 0;
      }
      return visibleItem;
    });

    const summary = {};
    mets.forEach(m => {
      summary[m] = 0;
    });

    result.forEach(item => {
      mets.forEach(m => {
        if (m !== 'vrpm') {
          summary[m] += item[m];
        }
      });
    });

    if (mets.includes('vrpm')) {
      const rev = summary.pub_revenues || 0;
      summary.vrpm = totalPageviewForVrpm > 0 ? (rev / totalPageviewForVrpm) * 1000 : 0;
    }

    return {
      status: true,
      report: {
        id: report._id.toString(),
        name: report.name,
        description: report.description,
        date_range_type: report.date_range_type,
        date_dynamic: report.date_dynamic,
        start_date: report.start_date,
        end_date: report.end_date,
        dimensions: report.dimensions,
        metrics: report.metrics,
        filters: effectiveSiteIds
      },
      result,
      summary
    };
  } catch (err) {
    console.error("Error in getReportDetailsAction:", err.message);
    return { status: false, error: err.message === 'Unauthorized' ? 'Session expired. Please log in again.' : err.message };
  }
}

// Server Action: CRUD - Create new report config locally
export async function createReportAction(reportData) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    const userId = user._id;
    const allowedSiteIds = getAllowedSiteIds(user);
    if (allowedSiteIds.length === 0) {
      return { status: false, error: 'No websites are assigned to this account.' };
    }

    const report = await Report.create({
      ...reportData,
      filters: sanitizeReportFilters(reportData.filters, allowedSiteIds),
      userId
    });

    return { status: true, id: report._id.toString() };
  } catch (err) {
    console.error("Error in createReportAction:", err.message);
    return { status: false, error: err.message === 'Unauthorized' ? 'Session expired. Please log in again.' : err.message };
  }
}

// Server Action: CRUD - Update report config locally
export async function updateReportAction(reportData) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    const userId = user._id;
    const allowedSiteIds = getAllowedSiteIds(user);
    if (allowedSiteIds.length === 0) {
      return { status: false, error: 'No websites are assigned to this account.' };
    }
    const { id, ...updateData } = reportData;
    updateData.filters = sanitizeReportFilters(updateData.filters, allowedSiteIds);

    const report = await Report.findOneAndUpdate(
      { _id: id, userId },
      updateData,
      { new: true }
    );

    if (!report) {
      return { status: false, error: 'Report config not found.' };
    }

    return { status: true };
  } catch (err) {
    console.error("Error in updateReportAction:", err.message);
    return { status: false, error: err.message === 'Unauthorized' ? 'Session expired. Please log in again.' : err.message };
  }
}

// Server Action: CRUD - Delete report config locally
export async function deleteReportAction(reportId) {
  try {
    await connectDB();
    const userId = await getCurrentUserId();

    const report = await Report.findOneAndDelete({ _id: reportId, userId });
    if (!report) {
      return { status: false, error: 'Report config not found.' };
    }

    return { status: true };
  } catch (err) {
    console.error("Error in deleteReportAction:", err.message);
    return { status: false, error: err.message === 'Unauthorized' ? 'Session expired. Please log in again.' : err.message };
  }
}
