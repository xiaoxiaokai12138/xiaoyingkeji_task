package studio.yingzuo.identity;

import java.time.Instant;
import java.util.List;
import org.apache.ibatis.annotations.*;

@Mapper
public interface IdentityMapper {
    @Select("SELECT id, demo_key, display_name FROM users ORDER BY demo_key") List<UserView> users();
    @Select("SELECT id, demo_key, display_name FROM users WHERE demo_key=#{key}") UserView userByKey(String key);
    @Select("SELECT u.id, u.demo_key, u.display_name FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=#{hash} AND s.expires_at > UTC_TIMESTAMP(6)") UserView sessionUser(String hash);
    @Insert("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(#{hash},#{userId},#{expiresAt})")
    void insertSession(@Param("hash") String hash, @Param("userId") String userId, @Param("expiresAt") Instant expiresAt);
    @Delete("DELETE FROM sessions WHERE token_hash=#{hash}") void deleteSession(String hash);
}
