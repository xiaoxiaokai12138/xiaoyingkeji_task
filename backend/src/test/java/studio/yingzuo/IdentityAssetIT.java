package studio.yingzuo;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import javax.imageio.ImageIO;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import com.fasterxml.jackson.databind.ObjectMapper;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class IdentityAssetIT {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    Cookie login(String key) throws Exception {
        var result = mvc.perform(post("/api/session").contentType(MediaType.APPLICATION_JSON).content("{\"demoUserKey\":\""+key+"\"}"))
                .andExpect(status().isOk()).andReturn();
        String header = result.getResponse().getHeader("Set-Cookie");
        assertThat(header).contains("HttpOnly", "SameSite=Lax", "Path=/");
        return new Cookie("studio_session", header.split(";", 2)[0].substring("studio_session=".length()));
    }
    byte[] png() throws Exception {
        var out = new ByteArrayOutputStream(); ImageIO.write(new BufferedImage(32, 24, BufferedImage.TYPE_INT_RGB), "png", out); return out.toByteArray();
    }
    @Test void sessionRestoresAndLogoutRevokes() throws Exception {
        mvc.perform(get("/api/session")).andExpect(status().isUnauthorized());
        Cookie alice = login("alice");
        mvc.perform(get("/api/session").cookie(alice)).andExpect(status().isOk()).andExpect(jsonPath("$.id").value("demo-alice"));
        mvc.perform(delete("/api/session").cookie(alice)).andExpect(status().isNoContent());
        mvc.perform(get("/api/session").cookie(alice)).andExpect(status().isUnauthorized());
    }
    @Test void uploadedFilesArePersistentAndOwnedBySession() throws Exception {
        Cookie alice = login("alice"), bob = login("bob");
        var file = new MockMultipartFile("file", "photo.png", "image/png", png());
        var result = mvc.perform(multipart("/api/assets").file(file).param("templateId", "demo-postcard").cookie(alice))
                .andExpect(status().isCreated()).andReturn();
        String preview = json.readTree(result.getResponse().getContentAsString()).path("previewUrl").asText();
        mvc.perform(get(preview).cookie(alice)).andExpect(status().isOk()).andExpect(content().bytes(png()));
        mvc.perform(get(preview).cookie(bob)).andExpect(status().isNotFound());
        mvc.perform(get(preview)).andExpect(status().isUnauthorized());
    }
    @Test void serverValidatesBytesTypeSizeAndRequiredParts() throws Exception {
        Cookie alice = login("alice");
        mvc.perform(multipart("/api/assets").file(new MockMultipartFile("file", "fake.png", "image/png", "not an image".getBytes()))
                .param("templateId", "demo-postcard").cookie(alice)).andExpect(status().isUnsupportedMediaType());
        mvc.perform(multipart("/api/assets").file(new MockMultipartFile("file", "fake.jpg", "image/jpeg", png()))
                .param("templateId", "demo-postcard").cookie(alice)).andExpect(status().isUnsupportedMediaType());
        mvc.perform(multipart("/api/assets").file(new MockMultipartFile("file", "large.png", "image/png", new byte[5*1024*1024+1]))
                .param("templateId", "demo-postcard").cookie(alice)).andExpect(status().isPayloadTooLarge());
        mvc.perform(multipart("/api/assets").param("templateId", "demo-postcard").cookie(alice)).andExpect(status().isBadRequest());
        mvc.perform(post("/api/session").contentType(MediaType.APPLICATION_JSON).content("{\"demoUserKey\":\"alice\",\"userId\":\"forged\"}"))
                .andExpect(status().isBadRequest());
    }
}
