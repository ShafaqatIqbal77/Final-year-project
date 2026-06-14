# Quick Start Guide - Audit & Monitoring Module

## Prerequisites
- Backend running: `php -S localhost:8000` (from `/CMS/backend`)
- Frontend running: `npm run dev` (from `/CMS/frontend`)
- MySQL database with schema installed

## Database Setup

### 1. Reinstall Database Schema
```bash
# From MySQL CLI
mysql -u root -p cms_college < /path/to/CMS/database/schema.sql
```

The schema now includes:
- Enhanced `activity_log` table
- New `login_history` table
- New `security_alerts` table

### 2. Verify Tables
```sql
SHOW TABLES;
-- Should include: activity_log, login_history, security_alerts
```

## Testing the Module

### 1. Login to Admin Dashboard
- URL: `http://localhost:5174/login` (or your port)
- Email: `admin@cms.local`
- Password: `Admin@123`

### 2. Navigate to Audit & Monitoring
- Click on "📊 Audit & Monitoring" in the admin dashboard
- You should see:
  - 5 statistics cards (Activities, Logins, Failed Logins, Alerts, Active Users)
  - 4 navigation tabs (Overview, Activity Logs, Login History, Security Alerts)

### 3. Test Each Component

#### Activity Logs Tab
- [ ] See list of all activities
- [ ] Filter by action, date range, entity type
- [ ] Pagination working
- [ ] Export CSV button works

#### Login History Tab
- [ ] See login/logout times
- [ ] Check session duration calculation
- [ ] View IP addresses
- [ ] Filter by status (success/failed)
- [ ] Export works

#### Security Alerts Tab
- [ ] See recent alerts
- [ ] Filter by severity level
- [ ] Acknowledge an alert (button changes)
- [ ] Unresolved only filter works
- [ ] Export CSV

#### Overview Tab
- [ ] See 4 charts: Activity Timeline, Login Success Rate, Alert Distribution, Top Actions
- [ ] Change time period (7, 30, 90, 365 days)
- [ ] Charts update when period changes

## API Testing

### Test Activity Logs Endpoint
```bash
curl -b cookies.txt "http://localhost:8000/audit/activity-logs?limit=10"
```

### Test Login History Endpoint
```bash
curl -b cookies.txt "http://localhost:8000/audit/login-history?limit=10"
```

### Test Security Alerts Endpoint
```bash
curl -b cookies.txt "http://localhost:8000/audit/security-alerts?limit=10"
```

### Test Statistics Endpoint
```bash
curl -b cookies.txt "http://localhost:8000/audit/stats"
```

### Test Charts Endpoint
```bash
curl -b cookies.txt "http://localhost:8000/audit/charts?type=activities&days=30"
```

## Generating Test Data

### Create Activity Logs
1. Login/logout (automatic logging)
2. Create a user
3. Create a course
4. Modify a course
5. Delete a user

### View in Activity Logs Tab
All actions should appear automatically.

## Common Issues & Solutions

### Issue: No data showing in Activity Logs
**Solution**: 
- Verify schema was applied: `DESC activity_log;`
- Check that logged-in user has admin role
- Try logging in/out to generate data

### Issue: Charts not loading
**Solution**:
- Check browser console for errors (F12)
- Verify all chart endpoints return data
- Clear browser cache (Ctrl+Shift+Delete)

### Issue: Export not working
**Solution**:
- Check that browser allows file downloads
- Verify CORS headers in backend
- Check error in Network tab (F12)

### Issue: Filter not working
**Solution**:
- Check that date format is YYYY-MM-DD
- Verify filter name matches API parameter
- Clear filters and try again

## Performance Tips

1. **Limit date ranges** for better performance
2. **Archive old data** regularly for faster queries
3. **Use pagination** for large datasets
4. **Check indexes** are created on activity_log table

## Security Checklist

- [x] Admin-only access enforced
- [x] IP addresses logged
- [x] Session IDs tracked
- [x] Failed login attempts recorded
- [x] All user actions audited
- [x] Exportable for compliance
- [x] CORS properly configured

## File Locations

### Backend
- Route handlers: `/CMS/backend/audit_handlers.php`
- DB functions: `/CMS/backend/bootstrap.php`
- API routes: `/CMS/backend/index.php`

### Frontend
- Main dashboard: `/CMS/frontend/src/components/MonitoringDashboard.jsx`
- Activity logs: `/CMS/frontend/src/components/ActivityLogs.jsx`
- Login history: `/CMS/frontend/src/components/LoginHistory.jsx`
- Security alerts: `/CMS/frontend/src/components/SecurityAlerts.jsx`
- Analytics: `/CMS/frontend/src/components/AuditAnalytics.jsx`
- Admin page: `/CMS/frontend/src/pages/AdminDashboard.jsx`

## Documentation

- Full documentation: `AUDIT_MONITORING_README.md`
- This guide: `AUDIT_MONITORING_SETUP.md`

## Support

For detailed API documentation, see:
- Backend handlers: Comments in `audit_handlers.php`
- Frontend components: JSDoc comments in component files
- Database schema: Comments in `schema.sql`

---

**Module Status**: ✅ Production Ready
**Last Verified**: June 3, 2026
