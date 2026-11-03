package top.gnon.backend.auth;

import java.util.Optional;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import top.gnon.backend.user.AppUser;
import top.gnon.backend.user.UserRepository;

@Service
public class AppUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public AppUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email)
            throws UsernameNotFoundException {

        if (email == null || email.trim().isEmpty()) {
            throw new UsernameNotFoundException("Account not found.");
        }

        String formattedEmail = email.trim().toLowerCase();
        Optional<AppUser> userOptional = userRepository.findByEmail(formattedEmail);

        if (!userOptional.isPresent()) {
            throw new UsernameNotFoundException("Account not found.");
        }

        AppUser user = userOptional.get();

        String status = user.getApprovalStatus();
        boolean isApproved = false;
        if (status != null && status.equalsIgnoreCase("APPROVED")) {
            isApproved = true;
        }

        boolean isBlocked = user.isBlocked();
        boolean isEnabled = false;

        if (isApproved && !isBlocked) {
            isEnabled = true;
        }

        String rawRole = user.getRole();
        String formattedRole = rawRole != null ? rawRole.toUpperCase() : "USER";

        User.UserBuilder builder = User.withUsername(user.getEmail());
        builder.password(user.getPasswordHash());
        builder.roles(formattedRole);
        
        if (!isEnabled) {
            builder.disabled(true);
        } else {
            builder.disabled(false);
        }

        return builder.build();
    }
}