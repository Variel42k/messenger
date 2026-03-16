package com.messenger.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtTokenProvider {

    public static final String ACCESS_TOKEN_TYPE = "access";
    public static final String REFRESH_TOKEN_TYPE = "refresh";
    public static final String TWO_FACTOR_TOKEN_TYPE = "2fa_challenge";
    private static final String TOKEN_TYPE_CLAIM = "token_type";

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.access-token-expiration}")
    private Long accessTokenExpiration;

    @Value("${jwt.refresh-token-expiration}")
    private Long refreshTokenExpiration;

    @Value("${jwt.two-factor-token-expiration:300000}")
    private Long twoFactorTokenExpiration;

    public String generateAccessToken(Authentication authentication) {
        return buildToken(authentication.getName(), accessTokenExpiration, ACCESS_TOKEN_TYPE);
    }

    public String generateRefreshToken(Authentication authentication) {
        return buildToken(authentication.getName(), refreshTokenExpiration, REFRESH_TOKEN_TYPE);
    }

    public String generateTwoFactorToken(String username) {
        return buildToken(username, twoFactorTokenExpiration, TWO_FACTOR_TOKEN_TYPE);
    }

    public String getUsernameFromToken(String token) {
        return getClaims(token).getSubject();
    }

    public String getTokenType(String token) {
        return getClaims(token).get(TOKEN_TYPE_CLAIM, String.class);
    }

    public boolean validateToken(String token) {
        try {
            getClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public boolean validateTokenOfType(String token, String expectedType) {
        try {
            Claims claims = getClaims(token);
            return expectedType.equals(claims.get(TOKEN_TYPE_CLAIM, String.class))
                    && !claims.getExpiration().before(new Date());
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public boolean validateToken(String token, org.springframework.security.core.userdetails.UserDetails userDetails) {
        final String username = getUsernameFromToken(token);
        return username.equals(userDetails.getUsername())
                && ACCESS_TOKEN_TYPE.equals(getTokenType(token))
                && !isTokenExpired(token);
    }

    private String buildToken(String subject, Long expirationMillis, String tokenType) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expirationMillis);

        return Jwts.builder()
                .setSubject(subject)
                .claim(TOKEN_TYPE_CLAIM, tokenType)
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .signWith(getSigningKey())
                .compact();
    }

    private boolean isTokenExpired(String token) {
        Date expiration = getExpirationDateFromToken(token);
        return expiration.before(new Date());
    }

    private Date getExpirationDateFromToken(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
        return claims.getExpiration();
    }

    private Claims getClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }
}
