package top.gnon.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;

import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.AuthorizeHttpRequestsConfigurer;
import org.springframework.security.config.annotation.web.configurers.SecurityContextConfigurer;
import org.springframework.security.config.annotation.web.configurers.SessionManagementConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;

import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;

import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.ArrayList;
import java.util.List;

@Configuration
public class SecurityConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        List<String> origins = new ArrayList<>();
        origins.add("http://localhost:5173");
        origins.add("http://localhost:8443");
        origins.add("http://localhost:8080");
        configuration.setAllowedOrigins(origins);

        List<String> methods = new ArrayList<>();
        methods.add("GET");
        methods.add("POST");
        methods.add("PUT");
        methods.add("PATCH");
        methods.add("DELETE");
        methods.add("OPTIONS");
        configuration.setAllowedMethods(methods);

        List<String> headers = new ArrayList<>();
        headers.add("Content-Type");
        headers.add("X-CSRF-TOKEN");
        configuration.setAllowedHeaders(headers);

        Boolean allowCredentials = Boolean.TRUE;
        configuration.setAllowCredentials(allowCredentials);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        String pattern = "/**";
        source.registerCorsConfiguration(pattern, configuration);

        return source;
    }

    @Bean
    public AuthenticationProvider authenticationProvider(
            UserDetailsService userDetailsService,
            PasswordEncoder passwordEncoder
    ) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder);
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationProvider authenticationProvider
    ) {
        List<AuthenticationProvider> providers = new ArrayList<>();
        providers.add(authenticationProvider);
        ProviderManager manager = new ProviderManager(providers);
        return manager;
    }

    @Bean
    public SecurityContextRepository securityContextRepository() {
        SecurityContextRepository repo = new HttpSessionSecurityContextRepository();
        return repo;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            SecurityContextRepository securityContextRepository
    ) throws Exception {

        http.cors(Customizer.withDefaults());

        http.securityContext(new Customizer<SecurityContextConfigurer<HttpSecurity>>() {
            @Override
            public void customize(SecurityContextConfigurer<HttpSecurity> context) {
                context.securityContextRepository(securityContextRepository);
            }
        });

        String ep1 = "/api/auth/me";
        String ep2 = "/api/auth/csrf";
        String ep3 = "/api/auth/register";
        String ep4 = "/api/auth/login";
        String ep5 = "/api/auth/logout";
        String ep6 = "/api/auth/reset-password-request";
        String ep7 = "/api/auth/reset-password";
        String ep8 = "/";

        http.authorizeHttpRequests(new Customizer<AuthorizeHttpRequestsConfigurer<HttpSecurity>.AuthorizationManagerRequestMatcherRegistry>() {
            @Override
            public void customize(AuthorizeHttpRequestsConfigurer<HttpSecurity>.AuthorizationManagerRequestMatcherRegistry auth) {
                auth.requestMatchers(ep1, ep2, ep3, ep4, ep5, ep6, ep7, ep8).permitAll();
                auth.anyRequest().authenticated();
            }
        });

        http.sessionManagement(new Customizer<SessionManagementConfigurer<HttpSecurity>>() {
            @Override
            public void customize(SessionManagementConfigurer<HttpSecurity> session) {
                session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED);
            }
        });

        http.formLogin(new Customizer<AbstractHttpConfigurer<org.springframework.security.config.annotation.web.configurers.FormLoginConfigurer<HttpSecurity>, HttpSecurity>>() {
            @Override
            public void customize(org.springframework.security.config.annotation.web.configurers.FormLoginConfigurer<HttpSecurity> configurer) {
                configurer.disable();
            }
        });

        http.httpBasic(new Customizer<AbstractHttpConfigurer<org.springframework.security.config.annotation.web.configurers.HttpBasicConfigurer<HttpSecurity>, HttpSecurity>>() {
            @Override
            public void customize(org.springframework.security.config.annotation.web.configurers.HttpBasicConfigurer<HttpSecurity> configurer) {
                configurer.disable();
            }
        });

        SecurityFilterChain chain = http.build();
        return chain;
    }
}