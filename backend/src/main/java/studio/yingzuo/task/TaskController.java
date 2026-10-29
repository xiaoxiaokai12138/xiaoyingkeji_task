package studio.yingzuo.task;

import java.net.URI;
import java.util.List;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import studio.yingzuo.identity.SessionService;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {
    private final TaskService tasks;
    private final SessionService sessions;
    public TaskController(TaskService tasks, SessionService sessions) { this.tasks=tasks; this.sessions=sessions; }
    @PostMapping public ResponseEntity<TaskService.TaskView> create(@Valid @RequestBody TaskRequest request,
            @CookieValue(name=SessionService.COOKIE,required=false) String token) {
        var task = tasks.create(request, sessions.require(token).id());
        return ResponseEntity.accepted().location(URI.create("/api/tasks/"+task.id())).body(task);
    }
    @GetMapping public List<TaskService.TaskView> history(@CookieValue(name=SessionService.COOKIE,required=false) String token) { return tasks.history(sessions.require(token).id()); }
    @GetMapping("/{id}") public TaskService.TaskView detail(@PathVariable String id,@CookieValue(name=SessionService.COOKIE,required=false) String token) { return tasks.get(id,sessions.require(token).id()); }
}
