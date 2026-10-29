package studio.yingzuo;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.*;
import java.util.concurrent.*;
import javax.imageio.ImageIO;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import com.fasterxml.jackson.databind.ObjectMapper;
import studio.yingzuo.task.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class TaskIT {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired TaskMapper mapper;
    @Autowired TaskTransactions tx;
    @Autowired TaskPipeline pipeline;
    Cookie login(String user) throws Exception {
        var response=mvc.perform(post("/api/session").contentType(MediaType.APPLICATION_JSON).content("{\"demoUserKey\":\""+user+"\"}"))
                .andExpect(status().isOk()).andReturn().getResponse();
        return new Cookie("studio_session",response.getHeader("Set-Cookie").split(";",2)[0].substring("studio_session=".length()));
    }
    Map<String,Object> request(Cookie cookie, Stage failure) throws Exception {
        var bytes=new ByteArrayOutputStream(); ImageIO.write(new BufferedImage(16,16,BufferedImage.TYPE_INT_RGB),"png",bytes);
        String response=mvc.perform(multipart("/api/assets").file(new MockMultipartFile("file","photo.png","image/png",bytes.toByteArray()))
                .param("templateId","demo-portrait").cookie(cookie)).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        Map<String,Object> config=new HashMap<>(); config.put("failAtStage",failure);
        config.put("stageDelayMs",Map.of("ASSET_CHECK",0,"GENERATE",0,"FINALIZE",0));
        return new HashMap<>(Map.of("templateId","demo-portrait","assetIds",List.of(json.readTree(response).path("id").asText()),"clientRequestId",UUID.randomUUID().toString(),"simulation",config));
    }
    String submit(Cookie cookie, Map<String,Object> body) throws Exception {
        String response=mvc.perform(post("/api/tasks").cookie(cookie).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsBytes(body)))
                .andExpect(status().isAccepted()).andReturn().getResponse().getContentAsString();
        return json.readTree(response).path("id").asText();
    }
    @Test void acceptanceQueriesAndFinalResultRespectBoundaries() throws Exception {
        Cookie alice=login("alice"); String id=submit(alice,request(alice,null));
        for (int i=0;i<3;i++) mvc.perform(get("/api/tasks/"+id).cookie(alice)).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("QUEUED"));
        assertThat(mapper.byId(id).version()).isZero(); assertThat(mapper.steps(id)).isEmpty();
        assertThat(tx.claim(id)).isTrue(); pipeline.execute(id);
        TaskRow completed=mapper.byId(id); assertThat(completed.status()).isEqualTo("SUCCEEDED");
        assertThat(mapper.steps(id)).extracting(StepRow::stage).containsExactly("ASSET_CHECK","GENERATE","FINALIZE");
        assertThat(mapper.steps(id)).allMatch(step -> step.status().equals("SUCCEEDED") && step.finishedAt()!=null);
        mvc.perform(get("/api/assets/"+completed.resultAssetId()+"/content").cookie(alice)).andExpect(status().isOk()).andExpect(content().contentType("image/png"));
        mvc.perform(get("/api/tasks/"+id).cookie(alice)).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("SUCCEEDED"));
        assertThat(mapper.byId(id).version()).isEqualTo(completed.version()); assertThat(tx.claim(id)).isFalse();
        Cookie bob=login("bob"); mvc.perform(get("/api/tasks/"+id).cookie(bob)).andExpect(status().isNotFound());
    }
    @ParameterizedTest @EnumSource(Stage.class)
    void persistedFailureHasNoFollowingSteps(Stage failure) throws Exception {
        Cookie alice=login("alice"); String id=submit(alice,request(alice,failure)); tx.claim(id); pipeline.execute(id);
        TaskRow row=mapper.byId(id); assertThat(row.status()).isEqualTo("FAILED"); assertThat(row.failedStage()).isEqualTo(failure.name());
        assertThat(row.errorCode()).isEqualTo("SIMULATED_FAILURE"); assertThat(row.resultAssetId()).isNull();
        assertThat(mapper.steps(id)).hasSize(failure.ordinal()+1); assertThat(mapper.steps(id).getLast().status()).isEqualTo("FAILED");
    }
    @Test void repeatedAndConcurrentSubmissionsAreIdempotent() throws Exception {
        Cookie alice=login("alice"); var body=request(alice,null); String id=submit(alice,body); assertThat(submit(alice,body)).isEqualTo(id);
        body.put("templateId","demo-film");
        mvc.perform(post("/api/tasks").cookie(alice).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsBytes(body)))
                .andExpect(status().isConflict());
        var concurrentBody=request(alice,null);
        ExecutorService pool=Executors.newFixedThreadPool(2);
        CountDownLatch gate=new CountDownLatch(1);
        try {
            Callable<String> call=() -> { gate.await(); return submit(alice,concurrentBody); };
            Future<String> first=pool.submit(call), second=pool.submit(call); gate.countDown();
            assertThat(first.get(10,TimeUnit.SECONDS)).isEqualTo(second.get(10,TimeUnit.SECONDS));
        } finally { pool.shutdownNow(); }
    }
    @Test void parametersAndOwnershipAreValidatedBeforeQueueing() throws Exception {
        Cookie alice=login("alice"), bob=login("bob"); var body=request(alice,null);
        mvc.perform(post("/api/tasks").cookie(bob).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsBytes(body))).andExpect(status().isNotFound());
        body.put("templateId","demo-postcard");
        mvc.perform(post("/api/tasks").cookie(alice).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsBytes(body))).andExpect(status().isBadRequest());
        body.put("templateId","demo-portrait"); body.put("simulation",Map.of("stageDelayMs",Map.of("GENERATE",-1)));
        mvc.perform(post("/api/tasks").cookie(alice).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsBytes(body))).andExpect(status().isBadRequest());
    }
    @Test void recoveryFailsInterruptedWorkButKeepsQueuedAndTerminalRecords() throws Exception {
        Cookie alice=login("alice"); String queued=submit(alice,request(alice,null)); String running=submit(alice,request(alice,null));
        tx.claim(running); tx.start(running,Stage.ASSET_CHECK); tx.recoverInterrupted();
        assertThat(mapper.byId(queued).status()).isEqualTo("QUEUED");
        assertThat(mapper.byId(running).status()).isEqualTo("FAILED");
        assertThat(mapper.byId(running).errorCode()).isEqualTo("PROCESS_INTERRUPTED");
        assertThat(mapper.steps(running).getFirst().status()).isEqualTo("FAILED");
    }
}
