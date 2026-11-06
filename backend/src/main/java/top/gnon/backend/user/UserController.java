package top.gnon.backend.user;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final org.springframework.jdbc.core.JdbcTemplate jdbc;

    public UserController(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            org.springframework.jdbc.core.JdbcTemplate jdbc
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jdbc = jdbc;
    }

    public record UserDto(
            UUID id,
            String email,
            String role,
            String approvalStatus,
            boolean blocked,
            boolean isProtected,
            OffsetDateTime createdAt
    ) {}

    public record CreateUserRequest(
            String email,
            String password,
            String role
    ) {}

    public record BlockRequest(
            boolean blocked
    ) {}

    public record RoleRequest(
            String role
    ) {}

    public record UpdateUserRequest(
            String email
    ) {}

    public record RightsRequest(
            List<String> rights
    ) {}

    private AppUser getCaller(Authentication auth) {
        if (auth == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated.");
        }
        if (auth.getName() == null || auth.getName().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated.");
        }

        Optional<AppUser> callerOpt = userRepository.findByEmail(auth.getName());
        if (!callerOpt.isPresent()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Caller account not found.");
        }
        AppUser caller = callerOpt.get();

        if (caller.getRole() != null && caller.getRole().equalsIgnoreCase("User")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied. Administrator privileges required.");
        }
        return caller;
    }

    private UserDto toDto(AppUser user, long activeSuperadmins) {
        boolean isProtected = false;
        if (user.getRole() != null && user.getRole().equalsIgnoreCase("Superadmin")) {
            if (activeSuperadmins <= 1) {
                isProtected = true;
            }
        }

        return new UserDto(
                user.getId(),
                user.getEmail(),
                user.getRole(),
                user.getApprovalStatus(),
                user.isBlocked(),
                isProtected,
                user.getCreatedAt()
        );
    }

    /**
     * S1-DEV-05: List users
     */
    @GetMapping
    public List<UserDto> listUsers(Authentication auth) {
        AppUser caller = getCaller(auth);
        long activeSuperadmins = userRepository.countByRoleAndBlockedFalse("Superadmin");

        List<AppUser> list;
        if (caller.getRole() != null && caller.getRole().equalsIgnoreCase("Superadmin")) {
            list = userRepository.findAllByOrderByCreatedAtDesc();
        } else {
            list = userRepository.findByRoleNotOrderByCreatedAtDesc("Superadmin");
        }

        List<UserDto> dtoList = new ArrayList<>();
        for (AppUser u : list) {
            UserDto dto = toDto(u, activeSuperadmins);
            dtoList.add(dto);
        }

        return dtoList;
    }

    /**
     * S1-DEV-05: Add a new user directly
     */
    @PostMapping
    public ResponseEntity<?> addUser(@RequestBody CreateUserRequest request, Authentication auth) {
        AppUser caller = getCaller(auth);

        if (request.email() == null || request.email().trim().length() == 0) {
            Map<String, String> errMap = new HashMap<>();
            errMap.put("message", "Email is required.");
            return ResponseEntity.badRequest().body(errMap);
        }

        String email = request.email().trim().toLowerCase(Locale.ROOT);
        String emailRegex = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$";
        if (!email.matches(emailRegex)) {
            Map<String, String> errMap = new HashMap<>();
            errMap.put("message", "Please enter a valid email.");
            return ResponseEntity.badRequest().body(errMap);
        }

        boolean exists = userRepository.existsByEmail(email);
        if (exists) {
            Map<String, String> errMap = new HashMap<>();
            errMap.put("message", "An account with this email already exists.");
            return ResponseEntity.status(HttpStatus.CONFLICT).body(errMap);
        }

        String rawPassword = "Temporary123!";
        if (request.password() != null && !request.password().trim().isEmpty()) {
            rawPassword = request.password();
        }

        String role = "User";
        if (caller.getRole() != null && caller.getRole().equalsIgnoreCase("Superadmin")) {
            if (request.role() != null) {
                String r = request.role().trim();
                if (r.equalsIgnoreCase("Admin")) {
                    role = "Admin";
                } else if (r.equalsIgnoreCase("Superadmin")) {
                    role = "Superadmin";
                }
            }
        }

        String encodedPassword = passwordEncoder.encode(rawPassword);
        AppUser newUser = new AppUser(email, encodedPassword, role);
        newUser.setApprovalStatus("APPROVED");

        AppUser saved = userRepository.save(newUser);
        long activeSuperadmins = userRepository.countByRoleAndBlockedFalse("Superadmin");

        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(saved, activeSuperadmins));
    }

    /**
     * S1-DEV-05: Edit user details (email)
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(
            @PathVariable UUID id,
            @RequestBody UpdateUserRequest request,
            Authentication auth
    ) {
        AppUser caller = getCaller(auth);
        Optional<AppUser> targetOpt = userRepository.findById(id);
        if (!targetOpt.isPresent()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found.");
        }
        AppUser target = targetOpt.get();

        boolean isCallerSuperadmin = caller.getRole() != null && caller.getRole().equalsIgnoreCase("Superadmin");
        boolean isTargetSuperadmin = target.getRole() != null && target.getRole().equalsIgnoreCase("Superadmin");

        if (!isCallerSuperadmin && isTargetSuperadmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot edit Superadmin accounts.");
        }

        if (request.email() != null && request.email().trim().length() > 0) {
            String newEmail = request.email().trim().toLowerCase(Locale.ROOT);
            if (!newEmail.equals(target.getEmail())) {
                if (userRepository.existsByEmail(newEmail)) {
                    Map<String, String> errMap = new HashMap<>();
                    errMap.put("message", "An account with this email already exists.");
                    return ResponseEntity.status(HttpStatus.CONFLICT).body(errMap);
                }
                target.setEmail(newEmail);
            }
        }

        AppUser saved = userRepository.save(target);
        long activeSuperadmins = userRepository.countByRoleAndBlockedFalse("Superadmin");
        return ResponseEntity.ok(toDto(saved, activeSuperadmins));
    }

    /**
     * S1-DEV-05 & S1-DEV-06: Block or Unblock user
     */
    @PatchMapping("/{id}/block")
    public ResponseEntity<?> toggleBlock(
            @PathVariable UUID id,
            @RequestBody BlockRequest request,
            Authentication auth
    ) {
        AppUser caller = getCaller(auth);
        Optional<AppUser> targetOpt = userRepository.findById(id);
        if (!targetOpt.isPresent()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found.");
        }
        AppUser target = targetOpt.get();

        boolean isCallerSuperadmin = caller.getRole() != null && caller.getRole().equalsIgnoreCase("Superadmin");
        boolean isTargetSuperadmin = target.getRole() != null && target.getRole().equalsIgnoreCase("Superadmin");

        if (!isCallerSuperadmin && isTargetSuperadmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot modify Superadmin accounts.");
        }

        if (request.blocked() && isTargetSuperadmin) {
            long activeSuperadmins = userRepository.countByRoleAndBlockedFalse("Superadmin");
            if (activeSuperadmins <= 1) {
                Map<String, String> errMap = new HashMap<>();
                errMap.put("message", "Role safeguards active: The last remaining Superadmin cannot be disabled or blocked.");
                return ResponseEntity.badRequest().body(errMap);
            }
        }

        target.setBlocked(request.blocked());
        AppUser saved = userRepository.save(target);

        long activeSuperadmins = userRepository.countByRoleAndBlockedFalse("Superadmin");
        return ResponseEntity.ok(toDto(saved, activeSuperadmins));
    }

    /**
     * S1-DEV-06: Superadmin approves pending user
     */
    @PatchMapping("/{id}/approve")
    public ResponseEntity<?> approveUser(
            @PathVariable UUID id,
            Authentication auth
    ) {
        AppUser caller = getCaller(auth);
        if (caller.getRole() == null || !caller.getRole().equalsIgnoreCase("Superadmin")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only Superadmins can approve accounts.");
        }

        Optional<AppUser> targetOpt = userRepository.findById(id);
        if (!targetOpt.isPresent()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found.");
        }
        AppUser target = targetOpt.get();

        target.setApprovalStatus("APPROVED");
        AppUser saved = userRepository.save(target);

        long activeSuperadmins = userRepository.countByRoleAndBlockedFalse("Superadmin");
        return ResponseEntity.ok(toDto(saved, activeSuperadmins));
    }

    /**
     * S1-DEV-06: Superadmin designates user role (Admin / User)
     */
    @PatchMapping("/{id}/role")
    public ResponseEntity<?> changeRole(
            @PathVariable UUID id,
            @RequestBody RoleRequest request,
            Authentication auth
    ) {
        AppUser caller = getCaller(auth);
        if (caller.getRole() == null || !caller.getRole().equalsIgnoreCase("Superadmin")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only Superadmins can designate roles.");
        }

        Optional<AppUser> targetOpt = userRepository.findById(id);
        if (!targetOpt.isPresent()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found.");
        }
        AppUser target = targetOpt.get();

        String requestedRole = request.role();
        if (requestedRole == null) {
            Map<String, String> errMap = new HashMap<>();
            errMap.put("message", "Role is required.");
            return ResponseEntity.badRequest().body(errMap);
        }

        String validRole = "User";
        if (requestedRole.equalsIgnoreCase("Superadmin")) {
            validRole = "Superadmin";
        } else if (requestedRole.equalsIgnoreCase("Admin")) {
            validRole = "Admin";
        }

        boolean isTargetSuperadmin = target.getRole() != null && target.getRole().equalsIgnoreCase("Superadmin");
        if (isTargetSuperadmin && !validRole.equalsIgnoreCase("Superadmin")) {
            long activeSuperadmins = userRepository.countByRoleAndBlockedFalse("Superadmin");
            if (activeSuperadmins <= 1) {
                Map<String, String> errMap = new HashMap<>();
                errMap.put("message", "Role safeguards active: The last remaining Superadmin cannot be demoted.");
                return ResponseEntity.badRequest().body(errMap);
            }
        }

        target.setRole(validRole);
        AppUser saved = userRepository.save(target);

        long activeSuperadmins = userRepository.countByRoleAndBlockedFalse("Superadmin");
        return ResponseEntity.ok(toDto(saved, activeSuperadmins));
    }

    /**
     * Superadmin deletes a user account
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(
            @PathVariable UUID id,
            Authentication auth
    ) {
        AppUser caller = getCaller(auth);
        if (caller.getRole() == null || !caller.getRole().equalsIgnoreCase("Superadmin")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only Superadmins can delete accounts.");
        }

        Optional<AppUser> targetOpt = userRepository.findById(id);
        if (!targetOpt.isPresent()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found.");
        }
        AppUser target = targetOpt.get();

        boolean isTargetSuperadmin = target.getRole() != null && target.getRole().equalsIgnoreCase("Superadmin");
        if (isTargetSuperadmin) {
            long activeSuperadmins = userRepository.countByRoleAndBlockedFalse("Superadmin");
            if (activeSuperadmins <= 1) {
                Map<String, String> errMap = new HashMap<>();
                errMap.put("message", "Role safeguards active: The last remaining Superadmin cannot be deleted.");
                return ResponseEntity.badRequest().body(errMap);
            }
        }

        userRepository.delete(target);

        Map<String, String> response = new HashMap<>();
        response.put("message", "User deleted successfully.");
        return ResponseEntity.ok(response);
    }

    /**
     * S1-DEV-07: Get user assigned rights
     */
    @GetMapping("/{id}/rights")
    public ResponseEntity<?> getUserRights(
            @PathVariable UUID id,
            Authentication auth
    ) {
        getCaller(auth);
        Optional<AppUser> targetOpt = userRepository.findById(id);
        if (!targetOpt.isPresent()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found.");
        }

        String sql = "SELECT permission_name FROM user_permission WHERE user_id = ? AND granted = TRUE AND deleted_at IS NULL";
        List<String> rights = jdbc.query(sql, (rs, rowNum) -> rs.getString("permission_name"), id);

        Map<String, Object> result = new HashMap<>();
        result.put("userId", id);
        result.put("rights", rights);

        return ResponseEntity.ok(result);
    }

    /**
     * S1-DEV-07: Assign per-action rights by module & log in audit_log
     */
    @PostMapping("/{id}/rights")
    public ResponseEntity<?> assignUserRights(
            @PathVariable UUID id,
            @RequestBody RightsRequest request,
            Authentication auth
    ) {
        AppUser caller = getCaller(auth);
        Optional<AppUser> targetOpt = userRepository.findById(id);
        if (!targetOpt.isPresent()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found.");
        }
        AppUser target = targetOpt.get();

        boolean isCallerSuperadmin = caller.getRole() != null && caller.getRole().equalsIgnoreCase("Superadmin");
        boolean isTargetSuperadmin = target.getRole() != null && target.getRole().equalsIgnoreCase("Superadmin");

        if (!isCallerSuperadmin && isTargetSuperadmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot modify Superadmin permissions.");
        }

        List<String> newRights = new ArrayList<>();
        if (request.rights() != null) {
            newRights = request.rights();
        }

        String fetchSql = "SELECT permission_name FROM user_permission WHERE user_id = ? AND granted = TRUE AND deleted_at IS NULL";
        List<String> oldRights = jdbc.query(fetchSql, (rs, rowNum) -> rs.getString("permission_name"), id);

        String deleteSql = "DELETE FROM user_permission WHERE user_id = ?";
        jdbc.update(deleteSql, id);

        String insertSql = "INSERT INTO user_permission (user_id, permission_name, granted) VALUES (?, ?, TRUE)";
        for (int i = 0; i < newRights.size(); i++) {
            String r = newRights.get(i);
            if (r != null && !r.trim().isEmpty()) {
                jdbc.update(insertSql, id, r.trim());
            }
        }

        String oldJson = "{\"rights\":" + toJsonArray(oldRights) + "}";
        String newJson = "{\"rights\":" + toJsonArray(newRights) + "}";

        String auditSql = "INSERT INTO audit_log (table_name, action, record_key, old_values, new_values, action_by, action_at) " +
                "VALUES ('user_permission', 'UPDATE', ?, ?::jsonb, ?::jsonb, ?, CURRENT_TIMESTAMP)";

        jdbc.update(auditSql, id.toString(), oldJson, newJson, caller.getEmail());

        Map<String, Object> response = new HashMap<>();
        response.put("message", "User permissions updated successfully.");
        response.put("userId", id);
        response.put("rights", newRights);

        return ResponseEntity.ok(response);
    }

    private String toJsonArray(List<String> items) {
        if (items == null || items.size() == 0) {
            return "[]";
        }
        StringBuilder sb = new StringBuilder();
        sb.append("[");
        for (int i = 0; i < items.size(); i++) {
            if (i > 0) {
                sb.append(",");
            }
            String item = items.get(i);
            if (item != null) {
                item = item.replace("\"", "\\\"");
            }
            sb.append("\"").append(item).append("\"");
        }
        sb.append("]");
        return sb.toString();
    }
}