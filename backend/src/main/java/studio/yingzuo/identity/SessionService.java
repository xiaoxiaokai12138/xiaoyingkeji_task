package studio.yingzuo.identity;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import studio.yingzuo.api.ApiException;

@Service
public class SessionService {
    public static final String COOKIE = "studio_session";
    private final IdentityMapper mapper;
    private final boolean demoMode;
    private final long ttl;
    private final SecureRandom random = new SecureRandom();
    public SessionService(IdentityMapper mapper, @Value("${DEMO_MODE:true}") boolean demoMode,
                          @Value("${SESSION_TTL_SECONDS:86400}") long ttl) {
        this.mapper = mapper; this.demoMode = demoMode; this.ttl = ttl;
    }
    public List<UserView> demoUsers() { guardDemo(); return mapper.users(); }
    public UserView require(String token) {
        UserView user = token == null || token.length() > 128 ? null : mapper.sessionUser(hash(token));
        if (user == null) throw new ApiException(401, "SESSION_REQUIRED", "请选择演示账户后继续，或重新登录");
        return user;
    }
    @Transactional
    public Login login(String key, String oldToken) {
        guardDemo();
        UserView user = mapper.userByKey(key);
        if (user == null) throw new ApiException(400, "INVALID_DEMO_USER", "请选择有效的演示账户");
        byte[] bytes = new byte[32]; random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        mapper.insertSession(hash(token), user.id(), Instant.now().plusSeconds(ttl));
        logout(oldToken);
        return new Login(user, token, ttl);
    }
    public void logout(String token) { if (token != null && token.length() <= 128) mapper.deleteSession(hash(token)); }
    private void guardDemo() { if (!demoMode) throw new ApiException(403, "DEMO_DISABLED", "当前环境未开放演示登录"); }
    private String hash(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
    }
    public record Login(UserView user, String token, long ttl) {}
}
