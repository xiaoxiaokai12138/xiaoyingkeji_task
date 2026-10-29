package studio.yingzuo.asset;

import org.apache.ibatis.annotations.*;

@Mapper
public interface AssetMapper {
    @Select("SELECT * FROM assets WHERE id=#{id}") AssetRow byId(String id);
    @Insert("INSERT INTO assets(id,user_id,purpose,storage_path,mime_type,size_bytes,created_at) VALUES(#{id},#{userId},#{purpose},#{storagePath},#{mimeType},#{sizeBytes},#{createdAt})") void insert(AssetRow row);
}
