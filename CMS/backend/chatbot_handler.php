<?php
declare(strict_types=1);

/**
 * CMS AI Chatbot Handler
 * Provides system-aware assistance for students, teachers, and admins.
 */

function handle_chatbot(PDO $pdo): void
{
    // Require session for security, but allow all roles
    if (empty($_SESSION['user_id'])) {
        json_out(['ok' => false, 'error' => 'Authentication required'], 401);
    }

    $in = json_in();
    $message = strtolower(trim((string) ($in['message'] ?? '')));

    if ($message === '') {
        json_out(['ok' => true, 'reply' => 'Hello! How can I help you with the College Management System today?']);
    }

    $reply = "";
    $quickReplies = [];

    // 1. SYSTEM STATS (Admin focus)
    if (preg_match('/\b(stats|how many|count|total|health|status)\b/', $message)) {
        $stats = [
            'students' => (int) $pdo->query("SELECT COUNT(*) FROM users WHERE role='student'")->fetchColumn(),
            'teachers' => (int) $pdo->query("SELECT COUNT(*) FROM users WHERE role='teacher'")->fetchColumn(),
            'courses' => (int) $pdo->query('SELECT COUNT(*) FROM courses')->fetchColumn(),
            'classes' => (int) $pdo->query('SELECT COUNT(*) FROM school_classes')->fetchColumn(),
        ];
        
        $reply = "The system is currently healthy! Here is a quick snapshot:\n";
        $reply .= "• **" . $stats['students'] . "** Enrolled Students\n";
        $reply .= "• **" . $stats['teachers'] . "** Faculty Members\n";
        $reply .= "• **" . $stats['courses'] . "** Active Courses\n";
        $reply .= "• **" . $stats['classes'] . "** School Classes\n\nIs there anything specific you'd like to check?";
        $quickReplies = ["Enrollment Status", "Active Courses", "User Directory"];
    }

    // 2. ENROLLMENT GUIDANCE
    if (!$reply && preg_match('/\b(enroll|register|join|apply)\b/', $message)) {
        $reply = "To enroll in a course, students should navigate to the **Course Catalog** in their sidebar, select an offering, and click 'Request Enrollment'. Teachers can then approve or reject these requests from their **Enrollments** tab.";
        $quickReplies = ["Course Catalog", "Enrollment Help"];
    }

    // 3. ATTENDANCE & GRADING
    if (!$reply && preg_match('/\b(attendance|absent|present|marks|grade|results)\b/', $message)) {
        $reply = "Attendance can be marked daily by teachers for each course offering. Final results are submitted by teachers and must be approved by the Admin before they are visible to students in the **Results** section.";
        $quickReplies = ["Mark Attendance", "Final Results"];
    }

    // 4. USER MANAGEMENT
    if (!$reply && preg_match('/\b(user|student|teacher|admin|profile|password)\b/', $message)) {
        $reply = "Users can be managed in the **Users** section. You can add new students or teachers, reset passwords, and toggle account activation status. Remember, only admins have full user management privileges.";
        $quickReplies = ["Add User", "Active Staff", "Active Students"];
    }

    // 5. SETTINGS & CUSTOMIZATION
    if (!$reply && preg_match('/\b(setting|customize|site|name|logo)\b/', $message)) {
        $reply = "Site-wide settings like the system name and contact information can be updated in the **Settings** tab. These changes reflect globally across all user panels.";
        $quickReplies = ["General Settings", "Site Theme"];
    }

    // 6. FALLBACK
    if (!$reply) {
        $reply = "I'm your CMS Assistant! I can help you with system statistics, enrollment procedures, attendance tracking, and grading workflows. What would you like to know about?";
        $quickReplies = ["System Stats", "Enrollment Help", "How to Grade?"];
    }

    json_out([
        'ok' => true,
        'reply' => $reply,
        'quickReplies' => $quickReplies
    ]);
}
