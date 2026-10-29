package studio.yingzuo;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class ApplicationIT {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;

    @Test void databaseMigrationAndHealthAreReady() throws Exception {
        assertThat(jdbc.queryForObject("SELECT config_value FROM app_metadata WHERE config_key='application'", String.class)).isEqualTo("material-studio");
        mvc.perform(get("/actuator/health")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("UP"));
        mvc.perform(get("/api/system")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ready"));
    }
}
