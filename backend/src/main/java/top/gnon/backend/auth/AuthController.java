package top.gnon.backend.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import jakarta.validation.Valid;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.authentication.session.ChangeSessionIdAuthenticationStrategy;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

import top.gnon.backend.user.AppUser;
import top.gnon.backend.user.UserRepository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final org.springframework.jdbc.core.JdbcTemplate jdbc;

    public AuthController(
            AuthService authService,
            AuthenticationManager authenticationManager,
            SecurityContextRepository securityContextRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            org.springframework.jdbc.core.JdbcTemplate jdbc
    ) {
        this.authService = authService;
        this.authenticationManager = authenticationManager;
        this.securityContextRepository = securityContextRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jdbc = jdbc;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(
            @Valid @RequestBody RegisterRequest request
    ) {
        try {
            AppUser user = authService.register(
                    request.email(),
                    request.password()
            );

            Map<String, Object> responseBody = new HashMap<>();
            responseBody.put("message", "Account registered successfully.");
            responseBody.put("id", user.getId());
            responseBody.put("email", user.getEmail());
            responseBody.put("role", user.getRole());
            responseBody.put("approvalStatus", user.getApprovalStatus());

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(responseBody);

        } catch (IllegalArgumentException e) {
            Map<String, String> errorMap = new HashMap<>();
            errorMap.put("message", e.getMessage());
            return ResponseEntity
                    .badRequest()
                    .body(errorMap);

        } catch (IllegalStateException | DataIntegrityViolationException e) {
            Map<String, String> conflictMap = new HashMap<>();
            conflictMap.put("message", "An account with this email already exists.");
            return ResponseEntity
                    .status(HttpStatus.CONFLICT)
                    .body(conflictMap);
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        try {
            UsernamePasswordAuthenticationToken authToken = 
                    UsernamePasswordAuthenticationToken.unauthenticated(
                            request.email(),
                            request.password()
                    );

            Authentication authentication = authenticationManager.authenticate(authToken);

            ChangeSessionIdAuthenticationStrategy sessionStrategy = 
                    new ChangeSessionIdAuthenticationStrategy();
            sessionStrategy.onAuthentication(authentication, httpRequest, httpResponse);

            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(authentication);
            SecurityContextHolder.setContext(context);

            securityContextRepository.saveContext(
                    context,
                    httpRequest,
                    httpResponse
            );

            Map<String, String> successResp = new HashMap<>();
            successResp.put("message", "Login successful.");
            successResp.put("email", authentication.getName());

            return ResponseEntity.ok(successResp);

        } catch (DisabledException e) {
            Map<String, String> err = new HashMap<>();
            err.put("message", "Your account is pending approval or blocked.");
            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(err);

        } catch (BadCredentialsException e) {
            Map<String, String> err = new HashMap<>();
            err.put("message", "Incorrect email or password.");
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(err);
        }
    }

    @GetMapping("/csrf")
    public Map<String, String> getCsrfToken(CsrfToken csrfToken) {
        Map<String, String> res = new HashMap<>();
        res.put("token", csrfToken.getToken());
        return res;
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(
            Authentication authentication
    ) {
        if (authentication == null) {
            Map<String, String> err = new HashMap<>();
            err.put("message", "Not authenticated.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(err);
        }
        
        if (!authentication.isAuthenticated()) {
            Map<String, String> err = new HashMap<>();
            err.put("message", "Not authenticated.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(err);
        }

        if (authentication.getName() == null) {
            Map<String, String> err = new HashMap<>();
            err.put("message", "Not authenticated.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(err);
        }

        Optional<AppUser> userOptional = userRepository.findByEmail(authentication.getName());

        if (userOptional.isPresent()) {
            AppUser user = userOptional.get();
            Map<String, Object> map = new HashMap<>();
            map.put("id", user.getId());
            map.put("email", user.getEmail());

            if (user.getFirstName() != null) {
                map.put("firstName", user.getFirstName());
            } else {
                map.put("firstName", "");
            }

            if (user.getLastName() != null) {
                map.put("lastName", user.getLastName());
            } else {
                map.put("lastName", "");
            }

            map.put("role", user.getRole());
            map.put("approvalStatus", user.getApprovalStatus());
            map.put("blocked", user.isBlocked());
            return ResponseEntity.ok(map);
        } else {
            Map<String, String> err = new HashMap<>();
            err.put("message", "Account not found.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(err);
        }
    }

    public record ProfileUpdateRequest(
            String firstName,
            String lastName,
            String currentPassword,
            String newPassword
    ) {}

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(
            @RequestBody ProfileUpdateRequest req,
            Authentication authentication
    ) {
        if (authentication == null || authentication.getName() == null) {
            Map<String, String> err = new HashMap<>();
            err.put("message", "Not authenticated.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(err);
        }

        Optional<AppUser> userOpt = userRepository.findByEmail(authentication.getName());
        if (!userOpt.isPresent()) {
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.NOT_FOUND, "User not found."
            );
        }
        AppUser user = userOpt.get();

        if (req.firstName() != null) {
            user.setFirstName(req.firstName().trim());
        }
        if (req.lastName() != null) {
            user.setLastName(req.lastName().trim());
        }

        boolean passwordChanged = false;
        if (req.newPassword() != null) {
            if (!req.newPassword().isBlank()) {
                if (req.currentPassword() == null || req.currentPassword().isBlank()) {
                    Map<String, String> err = new HashMap<>();
                    err.put("message", "Current password is required to set a new password.");
                    return ResponseEntity.badRequest().body(err);
                }
                
                boolean matches = passwordEncoder.matches(req.currentPassword(), user.getPasswordHash());
                if (!matches) {
                    Map<String, String> err = new HashMap<>();
                    err.put("message", "Incorrect current password.");
                    return ResponseEntity.badRequest().body(err);
                }
                
                if (req.newPassword().length() < 8) {
                    Map<String, String> err = new HashMap<>();
                    err.put("message", "New password must be at least 8 characters long.");
                    return ResponseEntity.badRequest().body(err);
                }
                
                byte[] bytes = req.newPassword().getBytes(java.nio.charset.StandardCharsets.UTF_8);
                if (bytes.length > 72) {
                    Map<String, String> err = new HashMap<>();
                    err.put("message", "New password is too long.");
                    return ResponseEntity.badRequest().body(err);
                }

                String encodedPassword = passwordEncoder.encode(req.newPassword());
                user.setPasswordHash(encodedPassword);
                passwordChanged = true;
            }
        }

        AppUser saved = userRepository.save(user);

        try {
            String auditAction = "EDIT";
            if (passwordChanged) {
                auditAction = "EDIT";
            }
            String query = "INSERT INTO audit_log (table_name, action, record_key, action_by, action_at) VALUES ('app_user', ?, ?, ?, CURRENT_TIMESTAMP)";
            jdbc.update(query, auditAction, saved.getId().toString(), saved.getEmail());
        } catch (Exception ex) {
            System.err.println("Could not write to audit_log during profile update: " + ex.getMessage());
        }

        Map<String, Object> resp = new HashMap<>();
        if (passwordChanged) {
            resp.put("message", "Profile and password updated successfully.");
        } else {
            resp.put("message", "Profile updated successfully.");
        }
        resp.put("id", saved.getId());
        resp.put("email", saved.getEmail());
        
        if (saved.getFirstName() != null) {
            resp.put("firstName", saved.getFirstName());
        } else {
            resp.put("firstName", "");
        }
        
        if (saved.getLastName() != null) {
            resp.put("lastName", saved.getLastName());
        } else {
            resp.put("lastName", "");
        }
        
        resp.put("role", saved.getRole());
        resp.put("approvalStatus", saved.getApprovalStatus());

        return ResponseEntity.ok(resp);
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) {
        SecurityContextLogoutHandler logoutHandler = new SecurityContextLogoutHandler();
        logoutHandler.logout(request, response, authentication);

        Map<String, String> res = new HashMap<>();
        res.put("message", "Logout successful.");
        return ResponseEntity.ok(res);
    }

    public record ResetPasswordRequestDto(String email) {}
    public record ResetPasswordDto(String token, String newPassword) {}

    @PostMapping("/reset-password-request")
    public ResponseEntity<?> requestPasswordReset(@RequestBody ResetPasswordRequestDto req) {
        if (req.email() == null || req.email().isBlank()) {
            Map<String, String> err = new HashMap<>();
            err.put("message", "Email is required.");
            return ResponseEntity.badRequest().body(err);
        }
        
        String email = req.email().trim().toLowerCase(java.util.Locale.ROOT);
        Optional<AppUser> userOpt = userRepository.findByEmail(email);

        String rawToken = java.util.UUID.randomUUID().toString();
        if (userOpt.isPresent()) {
            AppUser user = userOpt.get();
            String hashed = hashToken(rawToken);

            String insertTokenQuery = "INSERT INTO password_reset_token (user_id, token_hash, expiry_at, used) VALUES (?, ?, CURRENT_TIMESTAMP + INTERVAL '1 hour', FALSE)";
            jdbc.update(insertTokenQuery, user.getId(), hashed);

            String insertAuditQuery = "INSERT INTO audit_log (table_name, action, record_key, action_by, action_at) VALUES ('app_user', 'PASSWORD_RESET_REQUEST', ?, ?, CURRENT_TIMESTAMP)";
            jdbc.update(insertAuditQuery, user.getId().toString(), email);
        }

        Map<String, String> resp = new HashMap<>();
        resp.put("message", "If an account exists for this email, a password reset link has been dispatched.");
        resp.put("token", rawToken);

        return ResponseEntity.ok(resp);
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordDto req) {
        if (req.token() == null || req.token().isBlank()) {
            Map<String, String> err = new HashMap<>();
            err.put("message", "Reset token is required.");
            return ResponseEntity.badRequest().body(err);
        }
        if (req.newPassword() == null || req.newPassword().length() < 8) {
            Map<String, String> err = new HashMap<>();
            err.put("message", "Password must be at least 8 characters long.");
            return ResponseEntity.badRequest().body(err);
        }
        if (req.newPassword().getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72) {
            Map<String, String> err = new HashMap<>();
            err.put("message", "Password is too long.");
            return ResponseEntity.badRequest().body(err);
        }

        String hashedToken = hashToken(req.token().trim());
        String selectQuery = "SELECT id, user_id, expiry_at, used FROM password_reset_token WHERE token_hash = ? AND used = FALSE AND expiry_at > CURRENT_TIMESTAMP";
        List> rows = jdbc.queryForList(selectQuery, hashedToken);

        if (rows.size() == 0) {
            Map<String, String> err = new HashMap<>();
            err.put("message", "Link expired or already used. Request a new secure link.");
            return ResponseEntity.badRequest().body(err);
        }

        Map<String, Object> tokenRow = rows.get(0);
        java.util.UUID tokenId = (java.util.UUID) tokenRow.get("id");
        java.util.UUID userId = (java.util.UUID) tokenRow.get("user_id");

        Optional<AppUser> userOpt = userRepository.findById(userId);
        if (!userOpt.isPresent()) {
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.NOT_FOUND, "User account not found."
            );
        }
        AppUser user = userOpt.get();

        user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        userRepository.save(user);

        String updateTokenQuery = "UPDATE password_reset_token SET used = TRUE WHERE id = ?";
        jdbc.update(updateTokenQuery, tokenId);

        String insertAuditQuery = "INSERT INTO audit_log (table_name, action, record_key, action_by, action_at) VALUES ('app_user', 'PASSWORD_RESET_SUCCESS', ?, ?, CURRENT_TIMESTAMP)";
        jdbc.update(insertAuditQuery, userId.toString(), user.getEmail());

        Map<String, String> resp = new HashMap<>();
        resp.put("message", "Password successfully updated. You can now sign in with your new password.");
        return ResponseEntity.ok(resp);
    }

    private String hashToken(String token) {
        try {
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
            byte[] bytes = token.getBytes(java.nio.charset.StandardCharsets.UTF_8);
            byte[] hash = md.digest(bytes);
            
            StringBuilder hexString = new StringBuilder();
            for (int i = 0; i < hash.length; i++) {
                byte b = hash[i];
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }
}