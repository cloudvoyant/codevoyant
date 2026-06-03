# gRPC Services in C++

## Why this matters

gRPC is a high-performance RPC framework used to connect services in a distributed system. It solves several problems that raw HTTP/JSON doesn't:

- **Typed contracts** — `.proto` files define your API in a language-neutral schema. Both client and server code is generated from the same source, so mismatches between caller and callee are compile errors, not runtime failures.
- **Efficient wire format** — Protobuf serialization is 3-10x smaller and faster than JSON for most payloads.
- **Streaming** — gRPC natively supports server-to-client streaming, client-to-server streaming, and bidirectional streaming, without bolting on WebSockets.
- **Strong versioning** — field numbers in Protobuf are wire-stable. Adding a new field never breaks existing clients; removing requires an explicit deprecation cycle.

The C++ gRPC integration with CMake and Conan has several sharp edges — generated code landing in build directories, the need for both a runtime library and a code generator tool, and the two-pass codegen process. This recipe shows the complete setup.

## Proto file conventions

These conventions are the gRPC/Protobuf community standard. Following them ensures generated code interoperates correctly with other languages and tools:

- Filename: `lower_snake_case.proto` (e.g., `login_service.proto`)
- Directory mirrors package: `proto/acme/auth/v1/login_service.proto` → `package acme.auth.v1;`
- One package per directory; one major version per package (`v1`, `v2alpha`)
- Messages and services: `TitleCase`; fields: `snake_case`; enum values: `UPPER_SNAKE_CASE`
- Plural noun for `repeated` fields: `repeated User users = 1;`
- Always set explicit field numbers; reserve removed ones to prevent accidental reuse: `reserved 4, 7 to 9;`

```protobuf
syntax = "proto3";

package acme.auth.v1;

option cc_enable_arenas = true;   // enables arena allocation — see performance tips below
option java_package = "com.acme.auth.v1";

service LoginService {
  rpc Login(LoginRequest) returns (LoginResponse);
  rpc StreamSessions(StreamSessionsRequest) returns (stream Session);
  rpc UploadAudit(stream AuditEvent) returns (UploadAuditResponse);
}

message LoginRequest {
  string email = 1;
  string password = 2;
}

message LoginResponse {
  string token = 1;
  int64  expires_at_unix = 2;
}
```

Why `reserved 4, 7 to 9;`? If you remove field 4 and later add a new field that Protobuf assigns number 4 by default, old clients that still send field 4 will silently populate the wrong field on new servers. `reserved` prevents the field number from being reused.

## Repo layout

```
my-grpc-service/
  conanfile.py
  CMakeLists.txt
  proto/
    acme/auth/v1/
      login_service.proto
  src/
    server/
      main.cc
      login_service_impl.{h,cc}
    client/
      main.cc
  tests/
    login_service_test.cc
```

Generated `.pb.{h,cc}` and `.grpc.pb.{h,cc}` files live in `${CMAKE_BINARY_DIR}`. Never commit them — they're derived artifacts that change whenever the proto changes.

## Conan dependencies

```python
from conan import ConanFile
from conan.tools.cmake import CMakeToolchain, CMakeDeps, cmake_layout

class AuthService(ConanFile):
    settings = "os", "arch", "compiler", "build_type"
    generators = "CMakeToolchain", "CMakeDeps"

    def requirements(self):
        self.requires("grpc/1.65.0")        # runtime library — pulls protobuf + abseil + re2
        self.requires("gtest/1.15.0")

    def build_requirements(self):
        # protoc and grpc_cpp_plugin run during the build to generate C++ files.
        # They are tool_requires, not regular requires — this matters for cross-compilation:
        # tool_requires are built for the BUILD machine, not the HOST machine.
        self.tool_requires("protobuf/<host_version>")
        self.tool_requires("grpc/<host_version>")

    def layout(self):
        cmake_layout(self)
```

The `tool_requires` distinction is critical for cross-compilation. If you're building for ARM from an x86 host, `protoc` must run on x86 (the build machine). A regular `requires` would try to build protoc for ARM — where it can't run.

## CMake codegen — two passes

Proto codegen requires two `protobuf_generate` calls: one for the Protobuf messages (`.pb.h`, `.pb.cc`) and one for the gRPC service stubs (`.grpc.pb.h`, `.grpc.pb.cc`):

```cmake
cmake_minimum_required(VERSION 3.24)
project(auth_service CXX)
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(Protobuf REQUIRED CONFIG)
find_package(gRPC REQUIRED CONFIG)
find_package(absl REQUIRED CONFIG)

# One library target carrying the generated code.
# Both server and client link this — avoids generating code twice.
add_library(auth_proto STATIC)

set(PROTO_FILES
    proto/acme/auth/v1/login_service.proto)
target_sources(auth_proto PRIVATE ${PROTO_FILES})

# Pass 1: generate Protobuf message code (*.pb.h, *.pb.cc).
protobuf_generate(
    TARGET auth_proto
    LANGUAGE cpp
    IMPORT_DIRS proto
    PROTOC_OUT_DIR ${CMAKE_CURRENT_BINARY_DIR}/gen)

# Pass 2: generate gRPC service stub code (*.grpc.pb.h, *.grpc.pb.cc).
protobuf_generate(
    TARGET auth_proto
    LANGUAGE grpc
    GENERATE_EXTENSIONS .grpc.pb.h .grpc.pb.cc
    PLUGIN protoc-gen-grpc=$<TARGET_FILE:gRPC::grpc_cpp_plugin>
    PLUGIN_OPTIONS generate_mock_code=true    # enable gmock stubs for unit tests
    IMPORT_DIRS proto
    PROTOC_OUT_DIR ${CMAKE_CURRENT_BINARY_DIR}/gen)

target_include_directories(auth_proto PUBLIC ${CMAKE_CURRENT_BINARY_DIR}/gen)
target_link_libraries(auth_proto PUBLIC
    protobuf::libprotobuf
    gRPC::grpc++
    gRPC::grpc++_reflection)

add_subdirectory(src/server)
add_subdirectory(src/client)
enable_testing()
add_subdirectory(tests)
```

`gRPC::grpc++_reflection` enables the gRPC reflection protocol, allowing `grpcurl` to query your service's schema at runtime — invaluable for debugging in non-production environments.

Server target — `src/server/CMakeLists.txt`:

```cmake
add_executable(auth_server
    main.cc
    login_service_impl.cc)
target_link_libraries(auth_server PRIVATE auth_proto)
```

Build:

```bash
conan install . --output-folder=build --build=missing -s build_type=Release
cmake -S . -B build -DCMAKE_TOOLCHAIN_FILE=build/conan_toolchain.cmake \
    -DCMAKE_BUILD_TYPE=Release
cmake --build build -j
```

## Synchronous server

The synchronous API is the right starting point for most services. It's simpler, and for services that aren't CPU-bound, a thread-per-request model (what gRPC's synchronous API uses) handles thousands of concurrent requests:

```cpp
// login_service_impl.h
#include "acme/auth/v1/login_service.grpc.pb.h"

class LoginServiceImpl final
    : public acme::auth::v1::LoginService::Service {
 public:
  grpc::Status Login(grpc::ServerContext* ctx,
                     const acme::auth::v1::LoginRequest* req,
                     acme::auth::v1::LoginResponse* resp) override;
};
```

```cpp
// login_service_impl.cc
grpc::Status LoginServiceImpl::Login(
    grpc::ServerContext* ctx,
    const acme::auth::v1::LoginRequest* req,
    acme::auth::v1::LoginResponse* resp) {
  if (req->email().empty()) {
    return grpc::Status(grpc::StatusCode::INVALID_ARGUMENT, "email required");
  }
  auto token = MintToken(req->email());
  resp->set_token(token);
  resp->set_expires_at_unix(absl::ToUnixSeconds(absl::Now() + absl::Hours(24)));
  return grpc::Status::OK;
}
```

```cpp
// main.cc
int main() {
  LoginServiceImpl service;
  grpc::ServerBuilder builder;
  builder.AddListeningPort("0.0.0.0:50051",
                           grpc::InsecureServerCredentials());
  builder.RegisterService(&service);
  builder.SetMaxReceiveMessageSize(16 * 1024 * 1024);
  auto server = builder.BuildAndStart();
  LOG(INFO) << "auth_server listening on :50051";
  server->Wait();
}
```

## Synchronous client

```cpp
auto channel = grpc::CreateChannel(
    "auth.svc.cluster.local:50051", grpc::InsecureChannelCredentials());
auto stub = acme::auth::v1::LoginService::NewStub(channel);

acme::auth::v1::LoginRequest req;
req.set_email("ada@acme.io");
req.set_password("hunter2");

acme::auth::v1::LoginResponse resp;
grpc::ClientContext ctx;
ctx.set_deadline(std::chrono::system_clock::now() + std::chrono::seconds(5));

grpc::Status status = stub->Login(&ctx, req, &resp);
if (!status.ok()) {
  LOG(ERROR) << "login failed: " << status.error_code() << " "
             << status.error_message();
  return 1;
}
LOG(INFO) << "token=" << resp.token();
```

Always set a deadline. Without one, a hung server hangs every caller indefinitely. In a microservices context this cascades: Service A calls Service B calls Service C; if C hangs and there's no deadline, A and B both hang until their request threads are exhausted.

### Streaming variants

```cpp
// Server-to-client streaming: server sends a sequence of results.
grpc::ClientContext ctx;
auto reader = stub->StreamSessions(&ctx, req);
acme::auth::v1::Session s;
while (reader->Read(&s)) {
  Handle(s);
}
grpc::Status st = reader->Finish();

// Client-to-server streaming: client sends a sequence, server replies once.
grpc::ClientContext ctx;
acme::auth::v1::UploadAuditResponse resp;
auto writer = stub->UploadAudit(&ctx, &resp);
for (const auto& e : events) {
  if (!writer->Write(e)) break;   // stream broken — server likely disconnected
}
writer->WritesDone();
grpc::Status st = writer->Finish();
```

## Async server (high throughput)

For services that are genuinely CPU-bound or need maximum QPS, the async API avoids the overhead of one OS thread per in-flight RPC. The trade-off: significantly more complex code.

The async API uses a "completion queue" event loop and a state machine per RPC type:

```cpp
class CallData {
 public:
  CallData(LoginService::AsyncService* svc, grpc::ServerCompletionQueue* cq)
      : svc_(svc), cq_(cq), responder_(&ctx_), state_(CREATE) { Proceed(); }

  void Proceed() {
    if (state_ == CREATE) {
      state_ = PROCESS;
      svc_->RequestLogin(&ctx_, &req_, &responder_, cq_, cq_, this);
    } else if (state_ == PROCESS) {
      new CallData(svc_, cq_);                       // accept the next incoming call
      resp_.set_token(MintToken(req_.email()));
      state_ = FINISH;
      responder_.Finish(resp_, grpc::Status::OK, this);
    } else {                                          // FINISH
      delete this;
    }
  }

 private:
  enum State { CREATE, PROCESS, FINISH };
  LoginService::AsyncService* svc_;
  grpc::ServerCompletionQueue* cq_;
  grpc::ServerContext ctx_;
  LoginRequest req_;
  LoginResponse resp_;
  grpc::ServerAsyncResponseWriter<LoginResponse> responder_;
  State state_;
};

void HandleRpcs(LoginService::AsyncService* svc,
                grpc::ServerCompletionQueue* cq) {
  new CallData(svc, cq);                              // bootstrap the first CallData
  void* tag; bool ok;
  while (cq->Next(&tag, &ok) && ok) {
    static_cast<CallData*>(tag)->Proceed();
  }
}
```

Shutdown is mandatory and must be ordered: `server->Shutdown()` then `cq->Shutdown()`, then drain the queue until `cq->Next()` returns false. Skipping this causes `SIGSEGV` on exit.

## Async client

```cpp
class AsyncCaller {
 public:
  void Login(const LoginRequest& req) {
    AsyncCall* call = new AsyncCall;
    call->ctx.set_deadline(/* ... */);
    call->reader = stub_->AsyncLogin(&call->ctx, req, &cq_);
    call->reader->Finish(&call->resp, &call->status, /*tag=*/call);
  }

  void Drain() {
    void* tag; bool ok;
    while (cq_.Next(&tag, &ok)) {
      auto* call = static_cast<AsyncCall*>(tag);
      if (ok && call->status.ok()) Handle(call->resp);
      else LOG(WARNING) << call->status.error_message();
      delete call;
    }
  }

 private:
  struct AsyncCall {
    grpc::ClientContext ctx;
    LoginResponse resp;
    grpc::Status status;
    std::unique_ptr<grpc::ClientAsyncResponseReader<LoginResponse>> reader;
  };
  std::unique_ptr<LoginService::Stub> stub_;
  grpc::CompletionQueue cq_;
};
```

## Error handling

Return specific status codes — they're meaningful to callers for retry logic:

```cpp
return grpc::Status(grpc::StatusCode::NOT_FOUND,
                    absl::StrCat("user ", id, " not found"));
```

Standard codes and when to use them:
- `INVALID_ARGUMENT` — bad input from the caller (don't retry)
- `NOT_FOUND` — resource doesn't exist (don't retry)
- `ALREADY_EXISTS` — duplicate creation (don't retry)
- `PERMISSION_DENIED` — caller lacks authorization (don't retry)
- `RESOURCE_EXHAUSTED` — rate limited or quota exceeded (retry with backoff)
- `UNAVAILABLE` — server temporarily down (retry with backoff)
- `DEADLINE_EXCEEDED` — call took too long (retry if idempotent)
- `INTERNAL` — server bug (don't retry)

Client retry on `UNAVAILABLE`:

```cpp
if (status.error_code() == grpc::StatusCode::UNAVAILABLE) {
  // retryable — apply exponential backoff and retry
}
```

Bridge with `absl::Status` (avoids converting error codes manually throughout your codebase):

```cpp
grpc::Status AbslToGrpc(const absl::Status& s) {
  if (s.ok()) return grpc::Status::OK;
  return grpc::Status(static_cast<grpc::StatusCode>(s.code()),
                      std::string(s.message()));
}
```

Attach structured metadata for observability:

```cpp
ctx->AddTrailingMetadata("x-trace-id", trace_id);
```

## TLS

### Client with server certificate validation

```cpp
grpc::SslCredentialsOptions opts;
opts.pem_root_certs = ReadFile("/etc/ssl/certs/ca-bundle.crt");
auto creds = grpc::SslCredentials(opts);
auto channel = grpc::CreateChannel("svc:443", creds);
```

### Server with mutual TLS (mTLS)

mTLS requires the client to present a certificate too — stronger than one-way TLS for service-to-service communication:

```cpp
grpc::SslServerCredentialsOptions opts;
opts.pem_root_certs = ReadFile("ca.crt");
opts.pem_key_cert_pairs.push_back({ReadFile("server.key"), ReadFile("server.crt")});
opts.client_certificate_request =
    GRPC_SSL_REQUEST_AND_REQUIRE_CLIENT_CERTIFICATE_AND_VERIFY;
builder.AddListeningPort(addr, grpc::SslServerCredentials(opts));
```

### Per-call JWT credential

```cpp
auto call_creds = grpc::AccessTokenCredentials(jwt);
auto channel = grpc::CreateChannel("svc:443",
    grpc::CompositeChannelCredentials(grpc::SslCredentials({}), call_creds));
```

## Testing

### Unit test with a generated mock stub

`generate_mock_code=true` in the CMake codegen step generates a `Mock<Service>Stub` class. Use it to test client code without a running server:

```cpp
#include "acme/auth/v1/login_service_mock.grpc.pb.h"
#include <gmock/gmock.h>
#include <gtest/gtest.h>

using ::testing::_;
using ::testing::DoAll;
using ::testing::Return;
using ::testing::SetArgPointee;

TEST(LoginClient, Success) {
  acme::auth::v1::MockLoginServiceStub stub;
  acme::auth::v1::LoginResponse canned;
  canned.set_token("abc");

  EXPECT_CALL(stub, Login(_, _, _))
      .WillOnce(DoAll(SetArgPointee<2>(canned), Return(grpc::Status::OK)));

  LoginClient client(&stub);
  EXPECT_EQ(client.LoginAndGetToken("ada@acme.io", "pw"), "abc");
}
```

This pattern requires your client class to accept a pointer or reference to the stub interface, rather than creating its own stub internally — a design that also improves testability in general.

### Integration test with an in-process server

For streaming RPCs or scenarios where you want to test the actual server implementation, use an in-process server. It skips the network entirely:

```cpp
class LoginServiceFixture : public ::testing::Test {
 protected:
  void SetUp() override {
    grpc::ServerBuilder b;
    b.RegisterService(&service_);
    server_ = b.BuildAndStart();
    channel_ = server_->InProcessChannel(grpc::ChannelArguments{});
    stub_ = acme::auth::v1::LoginService::NewStub(channel_);
  }
  void TearDown() override { server_->Shutdown(); }

  LoginServiceImpl service_;
  std::unique_ptr<grpc::Server> server_;
  std::shared_ptr<grpc::Channel> channel_;
  std::unique_ptr<acme::auth::v1::LoginService::Stub> stub_;
};
```

`InProcessChannel` is faster than a loopback TCP connection and doesn't require a free port.

## Operational tips

- Always set a client deadline (`ctx.set_deadline(...)`).
- Enable health checking and reflection in non-production environments for `grpcurl` compatibility:
  ```cpp
  builder.RegisterService(&health_);
  ::grpc::reflection::InitProtoReflectionServerBuilderPlugin();
  ```
- Configure max message size on both ends (`SetMaxReceiveMessageSize` / `SetMaxSendMessageSize`). The server default is 4 MiB — easy to exceed with image or document payloads.
- For high QPS, use multiple `ServerCompletionQueue`s each pinned to a dedicated thread. A single CQ becomes a bottleneck at high request rates.
- Enable arena allocation (`option cc_enable_arenas = true;`) for large or frequently allocated messages. It reduces malloc overhead by bulk-allocating from a pool.
- `grpc::ClientContext::TryCancel()` cancels an in-flight call from another thread — use in shutdown sequences to drain pending calls quickly.
