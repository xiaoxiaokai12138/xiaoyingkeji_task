package studio.yingzuo.template;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface TemplateMapper {
    @Select("SELECT * FROM templates ORDER BY sort_order") List<TemplateRow> findAll();
    @Select("SELECT * FROM templates WHERE id = #{id}") TemplateRow findById(String id);
}
