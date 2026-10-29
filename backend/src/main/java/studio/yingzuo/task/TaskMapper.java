package studio.yingzuo.task;

import java.util.List;
import org.apache.ibatis.annotations.*;

@Mapper
public interface TaskMapper {
    @Select("SELECT * FROM tasks WHERE id=#{id}") TaskRow byId(String id);
    @Select("SELECT * FROM tasks WHERE user_id=#{userId} AND client_request_id=#{requestId}") TaskRow byRequest(@Param("userId") String userId,@Param("requestId") String requestId);
    @Select("SELECT * FROM tasks WHERE user_id=#{userId} ORDER BY created_at DESC, id DESC") List<TaskRow> history(String userId);
    @Select("SELECT id FROM tasks WHERE status='QUEUED' ORDER BY created_at,id LIMIT 1") String nextQueued();
    @Insert("INSERT INTO tasks(id,user_id,template_id,template_title,client_request_id,request_fingerprint,status,simulation_json,created_at,version) VALUES(#{id},#{userId},#{templateId},#{templateTitle},#{clientRequestId},#{requestFingerprint},'QUEUED',#{simulationJson},#{createdAt},0)") void insert(TaskRow row);
    @Insert("INSERT INTO task_assets(task_id,asset_id,slot_index) VALUES(#{task},#{asset},#{slot})") void link(@Param("task") String task,@Param("asset") String asset,@Param("slot") int slot);
    @Select("SELECT asset_id FROM task_assets WHERE task_id=#{id} ORDER BY slot_index") List<String> assetIds(String id);
    @Select("SELECT * FROM task_steps WHERE task_id=#{id} ORDER BY started_at,FIELD(stage,'ASSET_CHECK','GENERATE','FINALIZE')") List<StepRow> steps(String id);
    @Update("UPDATE tasks SET status='RUNNING', stage='ASSET_CHECK', started_at=UTC_TIMESTAMP(6),version=version+1 WHERE id=#{id} AND status='QUEUED'") int claim(String id);
    @Update("UPDATE tasks SET stage=#{stage},version=version+1 WHERE id=#{id} AND status='RUNNING'") int setStage(@Param("id") String id,@Param("stage") Stage stage);
    @Insert("INSERT INTO task_steps(task_id,stage,status,started_at) VALUES(#{id},#{stage},'RUNNING',UTC_TIMESTAMP(6))") void startStep(@Param("id") String id,@Param("stage") Stage stage);
    @Update("UPDATE task_steps SET status='SUCCEEDED',finished_at=UTC_TIMESTAMP(6) WHERE task_id=#{id} AND stage=#{stage} AND status='RUNNING'") void finishStep(@Param("id") String id,@Param("stage") Stage stage);
    @Update("UPDATE task_steps SET status='FAILED',finished_at=UTC_TIMESTAMP(6),error_message=#{message} WHERE task_id=#{id} AND stage=#{stage} AND status='RUNNING'") void failStep(@Param("id") String id,@Param("stage") Stage stage,@Param("message") String message);
    @Update("UPDATE tasks SET status='FAILED',failed_stage=stage,error_code=#{code},error_message=#{message},finished_at=UTC_TIMESTAMP(6),version=version+1 WHERE id=#{id} AND status='RUNNING'") void fail(@Param("id") String id,@Param("code") String code,@Param("message") String message);
    @Update("UPDATE tasks SET status='SUCCEEDED',result_asset_id=#{assetId},finished_at=UTC_TIMESTAMP(6),version=version+1 WHERE id=#{id} AND status='RUNNING' AND stage='FINALIZE'") int succeed(@Param("id") String id,@Param("assetId") String assetId);
    @Update("UPDATE task_steps SET status='FAILED',finished_at=UTC_TIMESTAMP(6),error_message='服务进程中断，任务未完成' WHERE status='RUNNING'") void interruptSteps();
    @Update("UPDATE tasks SET status='FAILED',failed_stage=stage,error_code='PROCESS_INTERRUPTED',error_message='服务进程中断，任务未完成',finished_at=UTC_TIMESTAMP(6),version=version+1 WHERE status='RUNNING'") void interruptTasks();
}
