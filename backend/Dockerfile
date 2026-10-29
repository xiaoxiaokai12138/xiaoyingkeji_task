FROM maven:3.9.11-eclipse-temurin-21@sha256:6fdc855a6ed81d288ca7ca37ac6ff5e9308b612485c0801d70b25a858c83d237 AS source
WORKDIR /app
COPY pom.xml ./
COPY .mvn ./.mvn
RUN --mount=type=cache,target=/maven-cache mvn -B -Dmaven.repo.local=/maven-cache dependency:go-offline && mkdir -p /root/.m2/repository && cp -a /maven-cache/. /root/.m2/repository/
COPY . .

FROM source AS check
CMD ["mvn", "-B", "verify"]

FROM source AS build
# Full tests run in the separate check image with its isolated database.
RUN mvn -B package -DskipTests

FROM eclipse-temurin:21-jre-jammy@sha256:9603446cf51296842eab342514857cf7ab55a8891cd564e6c68ec237fae65a16 AS runner
WORKDIR /app
RUN groupadd --system studio && useradd --system --gid studio studio && mkdir /app/data && chown studio:studio /app/data
COPY --from=build /app/target/material-studio-0.1.0.jar /app/app.jar
USER studio
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
