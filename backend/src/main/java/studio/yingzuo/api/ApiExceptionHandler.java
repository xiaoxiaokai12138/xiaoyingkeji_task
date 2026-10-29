package studio.yingzuo.api;

import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

@RestControllerAdvice
public class ApiExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);
    @ExceptionHandler(ApiException.class)
    public ResponseEntity<?> known(ApiException ex) { return error(ex.status(), ex.code(), ex.getMessage()); }
    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class,
            MissingServletRequestParameterException.class, MissingServletRequestPartException.class})
    public ResponseEntity<?> invalid(Exception ex) { return error(400, "INVALID_PARAMETERS", "请求参数不完整或格式不正确"); }
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<?> tooLarge(Exception ex) { return error(413, "FILE_TOO_LARGE", "图片超过允许的文件大小"); }
    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> unexpected(Exception ex) {
        String traceId = UUID.randomUUID().toString();
        log.error("Unexpected API failure traceId={}", traceId, ex);
        return ResponseEntity.status(500).body(Map.of("code", "INTERNAL_ERROR", "message", "服务暂时不可用，请稍后重试", "traceId", traceId));
    }
    private ResponseEntity<?> error(int status, String code, String message) {
        return ResponseEntity.status(status).body(Map.of("code", code, "message", message, "traceId", UUID.randomUUID().toString()));
    }
}
