# CMS API Routes Reference

This document catalogs all API routes, HTTP methods, parameters/request bodies, and calling frontend files identified across `frontend/src`. This specification serves as the blueprint for rebuilding the backend in the MERN stack (Node.js, Express, MongoDB).

## API Endpoints Summary Table

| Route Name | HTTP Method | Params / Request Body | Calling File |
|------------|-------------|-----------------------|--------------|
| `admin/stats` | GET | None | `frontend/src/pages/AdminDashboard.jsx` |
| `admin/users` | GET | `role` (query param: optional filter by role e.g. 'student', 'teacher', 'admin') | `frontend/src/pages/AdminDashboard.jsx`, `frontend/src/components/finance/FinanceDashboard.jsx` |
| `admin/users` | POST | JSON body: `{ email, password, role, full_name, phone, student_code, employee_code }` | `frontend/src/pages/AdminDashboard.jsx` |
| `admin/users` | PATCH | JSON body: `{ id, is_active }` or updated user profile fields | `frontend/src/pages/AdminDashboard.jsx` |
| `admin/users` | DELETE | JSON body: `{ id }` | `frontend/src/pages/AdminDashboard.jsx` |
| `classes` | GET | None | `frontend/src/pages/AdminDashboard.jsx` |
| `classes` | POST | JSON body: `{ name, program, year_level }` | `frontend/src/pages/AdminDashboard.jsx` |
| `classes` | PATCH | JSON body: `{ id, name, program, year_level }` | `frontend/src/pages/AdminDashboard.jsx` |
| `classes` | DELETE | JSON body: `{ id }` | `frontend/src/pages/AdminDashboard.jsx` |
| `sections` | GET | `class_id` (query param) | `frontend/src/pages/AdminDashboard.jsx` |
| `sections` | POST | JSON body: `{ class_id, name, capacity }` | `frontend/src/pages/AdminDashboard.jsx` |
| `sections` | DELETE | JSON body: `{ id }` | `frontend/src/pages/AdminDashboard.jsx` |
| `courses` | GET | None | `frontend/src/pages/AdminDashboard.jsx` |
| `courses` | POST | JSON body: `{ code, title, description, credits }` | `frontend/src/pages/AdminDashboard.jsx` |
| `courses` | PATCH | JSON body: `{ id, code, title, description, credits }` | `frontend/src/pages/AdminDashboard.jsx` |
| `courses` | DELETE | JSON body: `{ id }` | `frontend/src/pages/AdminDashboard.jsx` |
| `offerings` | GET | None | `frontend/src/pages/AdminDashboard.jsx`, `frontend/src/pages/TeacherDashboard.jsx` |
| `offerings` | POST | JSON body: `{ course_id, section_id, teacher_id, semester, academic_year }` | `frontend/src/pages/AdminDashboard.jsx` |
| `offerings` | DELETE | JSON body: `{ id }` | `frontend/src/pages/AdminDashboard.jsx` |
| `admin/activity` | GET | None | `frontend/src/pages/AdminDashboard.jsx` |
| `admin/pending-results` | GET | None | `frontend/src/pages/AdminDashboard.jsx` |
| `settings` | GET | None | `frontend/src/pages/AdminDashboard.jsx` |
| `settings` | PATCH | JSON body: `{ site_name, academic_year }` | `frontend/src/pages/AdminDashboard.jsx` |
| `admin/enrollments` | GET | None | `frontend/src/pages/AdminDashboard.jsx` |
| `admin/enrollments` | POST | JSON body: `{ enrollment_id, status }` | `frontend/src/pages/AdminDashboard.jsx` |
| `student/catalog` | GET | None | `frontend/src/pages/StudentDashboard.jsx` |
| `enrollments` | GET | None | `frontend/src/pages/StudentDashboard.jsx`, `frontend/src/pages/TeacherDashboard.jsx` |
| `enrollments` | POST | JSON body: `{ action: 'request', course_offering_id }` OR `{ action: 'decide', enrollment_id, status }` | `frontend/src/pages/StudentDashboard.jsx`, `frontend/src/pages/TeacherDashboard.jsx` |
| `teacher/students` | GET | `course_offering_id` (query param) | `frontend/src/pages/TeacherDashboard.jsx` |
| `attendance` | GET | `course_offering_id` (query param) | `frontend/src/pages/StudentDashboard.jsx` |
| `attendance` | POST | JSON body: `{ course_offering_id, class_date, records }` | `frontend/src/pages/TeacherDashboard.jsx` |
| `assignments` | GET | `course_offering_id` (query param) | `frontend/src/pages/StudentDashboard.jsx`, `frontend/src/pages/TeacherDashboard.jsx` |
| `submissions` | GET | `assignment_id` (query param) | `frontend/src/pages/TeacherDashboard.jsx` |
| `submissions/grade` | POST | JSON body: `{ submission_id, marks_obtained, feedback }` | `frontend/src/pages/TeacherDashboard.jsx` |
| `marks` | GET | `course_offering_id` (query param) | `frontend/src/pages/StudentDashboard.jsx`, `frontend/src/pages/TeacherDashboard.jsx` |
| `marks` | POST | JSON body: `{ course_offering_id, student_id, mark_type, title, marks_obtained, max_marks }` | `frontend/src/pages/TeacherDashboard.jsx` |
| `final-results` | GET | `course_offering_id` (query param) | `frontend/src/pages/StudentDashboard.jsx`, `frontend/src/pages/TeacherDashboard.jsx` |
| `final-results` | POST | JSON body: `{ action: 'save'\|'submit'\|'approve'\|'reject', course_offering_id, student_id, total_marks, grade, teacher_notes, id }` | `frontend/src/pages/AdminDashboard.jsx`, `frontend/src/pages/TeacherDashboard.jsx` |
| `finance/dashboard` | GET | None | `frontend/src/components/finance/FinanceDashboard.jsx` |
| `finance/fees` | GET | Query params: `status`, `student_id`, `search`, `page` | `frontend/src/components/finance/FinanceDashboard.jsx` |
| `finance/fees` | POST | JSON body: `{ student_id, fee_type, amount, discount, fine, due_date, semester, remarks }` | `frontend/src/components/finance/FinanceDashboard.jsx` |
| `finance/fees` | PATCH | JSON body: `{ id, paid_amount, status, remarks }` | `frontend/src/components/finance/FinanceDashboard.jsx` |
| `finance/fees` | DELETE | JSON body: `{ id }` | `frontend/src/components/finance/FinanceDashboard.jsx` |
| `finance/collect-fee` | POST | JSON body: `{ fee_id, amount, payment_method, notes }` | `frontend/src/components/finance/FinanceDashboard.jsx` |
| `finance/salaries` | GET | Query params: `status`, `employee_id`, `month`, `year`, `search`, `page` | `frontend/src/components/finance/FinanceDashboard.jsx` |
| `finance/salaries` | POST | JSON body: `{ employee_id, month, year, amount, basic_salary, allowances, bonus, overtime, deductions, tax, net_salary, bank_info, remarks }` | `frontend/src/components/finance/FinanceDashboard.jsx` |
| `finance/salaries` | PATCH | JSON body: `{ id, status, amount, remarks }` | `frontend/src/components/finance/FinanceDashboard.jsx` |
| `finance/expenses` | GET | Query params: `category`, `status`, `search`, `page` | `frontend/src/components/finance/FinanceDashboard.jsx` |
| `finance/expenses` | POST | JSON body: `{ title, category, amount, expense_date, description }` | `frontend/src/components/finance/FinanceDashboard.jsx` |
| `finance/approve-expense` | POST | JSON body: `{ id, status }` | `frontend/src/components/finance/FinanceDashboard.jsx` |
| `finance/incomes` | GET | Query params: `source`, `search`, `page` | `frontend/src/components/finance/FinanceDashboard.jsx` |
| `finance/incomes` | POST | JSON body: `{ source, amount, income_date, description }` | `frontend/src/components/finance/FinanceDashboard.jsx` |
| `finance/fee-structures` | GET | None | `frontend/src/components/finance/FinanceDashboard.jsx` |
| `finance/scholarships` | GET | None | `frontend/src/components/finance/FinanceDashboard.jsx` |
| `finance/pending-dues` | GET | None | `frontend/src/components/finance/FinanceDashboard.jsx` |
| `finance/notifications` | GET | None | `frontend/src/components/finance/FinanceDashboard.jsx`, `frontend/src/pages/StudentDashboard.jsx` |
| `finance/notifications` | PATCH | JSON body: `{ id }` | `frontend/src/components/finance/FinanceDashboard.jsx` |
| `finance/audit` | GET | Query params: `date_from`, `date_to` | `frontend/src/components/finance/FinanceDashboard.jsx` |
| `finance/late-fee-rules` | GET | None | `frontend/src/components/finance/FinanceDashboard.jsx` |
| `finance/installments` | GET | None | `frontend/src/components/finance/FinanceDashboard.jsx`, `frontend/src/pages/StudentDashboard.jsx` |
| `finance/reports` | GET | Query params: `report_type`, `date_from`, `date_to` | `frontend/src/components/finance/FinanceDashboard.jsx` |
| `finance/send-reminder` | POST | JSON body: `{ fee_id, channel: 'notification' }` | `frontend/src/components/finance/FinanceDashboard.jsx` |
| `finance/my-fees` | GET | None | `frontend/src/pages/StudentDashboard.jsx` |
| `finance/my-salary` | GET | None | `frontend/src/pages/TeacherDashboard.jsx` |
| `finance/online-payments` | POST | JSON body: `{ fee_id, amount, gateway }` | `frontend/src/pages/StudentDashboard.jsx` |
| `/audit/security-alerts` | GET | Query params: `limit`, `offset`, `severity`, `alert_type`, `unread_only`, `start_date`, `end_date` | `frontend/src/components/SecurityAlerts.jsx` |
| `/audit/security-alerts` | PATCH | JSON body: `{ alert_id }` | `frontend/src/components/SecurityAlerts.jsx` |
| `/audit/export` | GET | Query params: `type=alerts`, `format=csv`, filters (`severity`, `alert_type`, `start_date`, `end_date`) | `frontend/src/components/SecurityAlerts.jsx` |
| `/api/v1/finance/transactions` | GET | Query params: `page`, `limit`, `type`, `category`, `start_date`, `end_date`, `search` | `frontend/src/hooks/useFinanceApi.ts` |
| `/api/v1/finance/transactions` | POST | JSON or `multipart/form-data` (if attachment is File): `{ type, category_id, payment_method_id, amount, transaction_date, reference_number, description, payee_payer, attachment }` | `frontend/src/hooks/useFinanceApi.ts` |
| `/api/v1/finance/invoices` | GET | Query params: filter params | `frontend/src/hooks/useFinanceApi.ts` |
| `/api/v1/finance/invoices` | POST | JSON body: `{ invoice_number, user_id, type, amount, tax, discount, total_amount, due_date, items, notes }` | `frontend/src/hooks/useFinanceApi.ts` |
| `/api/v1/finance/budgets` | GET | Query params: filter params | `frontend/src/hooks/useFinanceApi.ts` |
| `/api/v1/finance/budgets` | POST | JSON body: `{ category_id, fiscal_year, allocated_amount, period, start_date, end_date, notes }` | `frontend/src/hooks/useFinanceApi.ts` |
| `/api/v1/finance/transactions/summary` | GET | Query params: `{ start_date, end_date }` | `frontend/src/hooks/useFinanceApi.ts` |
| `/api/v1/finance/reports/profit-loss` | GET | Query params: `{ start_date, end_date }` | `frontend/src/hooks/useFinanceApi.ts` |
| `/api/v1/finance/reports/cashflow` | GET | Query params: `{ year, month }` | `frontend/src/hooks/useFinanceApi.ts` |

## MERN Backend Migration Notes

1. **Authentication & Session**:
   - Currently, the legacy frontend passes a session identifier via the `X-Session-Id` header and `Authorization: Bearer <session_id>`.
   - In Express + MongoDB, implement JWT authentication returning a token on `/api/auth/login`.
2. **REST Path Modernization**:
   - The legacy backend routed requests using `?route=<name>` query strings.
   - For Express, map routes to RESTful paths:
     - `admin/users` -> `/api/admin/users`
     - `classes` -> `/api/classes`
     - `sections` -> `/api/sections`
     - `courses` -> `/api/courses`
     - `offerings` -> `/api/offerings`
     - `enrollments` -> `/api/enrollments`
     - `attendance` -> `/api/attendance`
     - `marks` -> `/api/marks`
     - `final-results` -> `/api/final-results`
     - `finance/*` -> `/api/finance/*`
     - `audit/*` -> `/api/audit/*`
