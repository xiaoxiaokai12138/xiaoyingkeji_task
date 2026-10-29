package studio.yingzuo;

import java.time.Instant;
import java.util.Map;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import studio.yingzuo.task.*;
import studio.yingzuo.asset.AssetRow;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class TaskPipelineTest {
    private final TaskMapper mapper = mock(TaskMapper.class);
    private final TaskTransactions tx = mock(TaskTransactions.class);
    private final GenerationEngine engine = mock(GenerationEngine.class);
    private final StageDelay delay = mock(StageDelay.class);
    private final ObjectMapper json = new ObjectMapper();
    private final TaskPipeline pipeline = new TaskPipeline(mapper,tx,engine,delay,json);

    private TaskRow task(Stage fail) throws Exception {
        String config = json.writeValueAsString(new SimulationConfig.Snapshot(fail,Map.of(Stage.ASSET_CHECK,23,Stage.GENERATE,23,Stage.FINALIZE,23)));
        TaskRow row = new TaskRow("task","user","template","title","request","hash","RUNNING","ASSET_CHECK",config,null,null,null,null,Instant.EPOCH,Instant.EPOCH,null,1);
        when(mapper.byId("task")).thenReturn(row); return row;
    }
    @Test void successHasThreeOrderedBoundariesAndInjectedDelays() throws Exception {
        TaskRow row=task(null);
        AssetRow result=new AssetRow("result","user","RESULT","result.png","image/png",100,Instant.EPOCH);
        when(engine.perform(Stage.FINALIZE,row)).thenReturn(result);
        pipeline.execute("task");
        var order=inOrder(tx,engine);
        order.verify(tx).start("task",Stage.ASSET_CHECK); order.verify(engine).perform(Stage.ASSET_CHECK,row); order.verify(tx).complete("task",Stage.ASSET_CHECK);
        order.verify(tx).start("task",Stage.GENERATE); order.verify(engine).perform(Stage.GENERATE,row); order.verify(tx).complete("task",Stage.GENERATE);
        order.verify(tx).start("task",Stage.FINALIZE); order.verify(engine).perform(Stage.FINALIZE,row); order.verify(tx).succeed("task",result);
        verify(delay,times(3)).pause(23); verify(tx,never()).fail(anyString(),any(),anyString(),anyString());
    }
    @ParameterizedTest @EnumSource(Stage.class)
    void eachConfiguredFailureStopsFollowingStages(Stage failure) throws Exception {
        TaskRow row=task(failure); pipeline.execute("task");
        verify(tx).fail(eq("task"),eq(failure),eq("SIMULATED_FAILURE"),contains(failure.label()));
        verify(tx,never()).succeed(anyString(),any());
        for (Stage stage:Stage.values()) {
            if (stage.ordinal() > failure.ordinal()) verify(tx,never()).start("task",stage);
            if (stage.ordinal() >= failure.ordinal()) verify(engine,never()).perform(stage,row);
            else verify(tx).complete("task",stage);
        }
    }
    @Test void realHandlerFailureAlsoStopsPipeline() throws Exception {
        TaskRow row=task(null); when(engine.perform(Stage.GENERATE,row)).thenThrow(new java.io.IOException("disk unavailable"));
        pipeline.execute("task");
        verify(tx).fail(eq("task"),eq(Stage.GENERATE),eq("GENERATION_ERROR"),contains("模拟生成"));
        verify(tx,never()).start("task",Stage.FINALIZE);
    }
}
