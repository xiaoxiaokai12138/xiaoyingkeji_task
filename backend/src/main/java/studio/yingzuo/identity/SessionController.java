package studio.yingzuo.identity;

import java.util.List;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class SessionController {
    private final SessionService service;
    private final boolean secure;
    public SessionController(SessionService service, @Value("${SESSION_COOKIE_SECURE:false}") boolean secure) {
        this.service = service; this.secure = secure;
    }
    @GetMapping("/demo-users") public List<UserView> users() { return service.demoUsers(); }
    @GetMapping("/session") public UserView current(@CookieValue(name=SessionService.COOKIE, required=false) String token) { return service.require(token); }
    @PostMapping("/session") public ResponseEntity<UserView> login(@Valid @RequestBody LoginRequest request,
            @CookieValue(name=SessionService.COOKIE, required=false) String oldToken) {
        SessionService.Login result = service.login(request.demoUserKey(), oldToken);
        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, cookie(result.token(), result.ttl()).toString()).body(result.user());
    }
    @DeleteMapping("/session") public ResponseEntity<Void> logout(@CookieValue(name=SessionService.COOKIE, required=false) String token) {
        service.logout(token);
        return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, cookie("", 0).toString()).build();
    }
    private ResponseCookie cookie(String token, long ttl) {
        return ResponseCookie.from(SessionService.COOKIE, token).path("/").httpOnly(true).sameSite("Lax").secure(secure).maxAge(ttl).build();
    }
    public record LoginRequest(@NotBlank @Size(max=40) String demoUserKey) {}
}
