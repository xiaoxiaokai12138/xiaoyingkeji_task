package studio.yingzuo;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class TemplateIT {
    @Autowired MockMvc mvc;
    @Test void templatesAreSeededAndFilterable() throws Exception {
        mvc.perform(get("/api/templates/categories")).andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(3)));
        mvc.perform(get("/api/templates")).andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(6)));
        mvc.perform(get("/api/templates").param("category", "创意图片")).andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(2)));
        mvc.perform(get("/api/templates").param("category", "不存在的分类")).andExpect(status().isOk()).andExpect(content().json("[]"));
    }
    @Test void detailConstraintsAndLocalCoversAreAvailable() throws Exception {
        mvc.perform(get("/api/templates/demo-postcard")).andExpect(status().isOk()).andExpect(jsonPath("$.requiredImageCount").value(2))
                .andExpect(jsonPath("$.acceptedMimeTypes", hasItem("image/png")));
        for (String id : new String[]{"demo-postcard", "demo-portrait", "demo-pet", "demo-city", "demo-garden", "demo-film"}) {
            mvc.perform(get("/api/templates/" + id + "/cover")).andExpect(status().isOk()).andExpect(content().contentType("image/svg+xml"))
                    .andExpect(content().string(containsString("<svg")));
        }
        mvc.perform(get("/api/templates/not-exist")).andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }
}
