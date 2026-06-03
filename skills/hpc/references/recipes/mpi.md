# MPI Fundamentals

## What MPI Is

Message Passing Interface (MPI) is a standard for communication between processes, typically across multiple nodes in a cluster. Each MPI process (called a "rank") has its own private memory space. Data is exchanged explicitly via messages — there is no shared memory between ranks.

MPI scales from a laptop (multiple processes on one machine) to thousands of nodes on a supercomputer. It's the foundation of nearly all large-scale scientific computing: weather simulation, molecular dynamics, computational fluid dynamics, distributed training of large ML models.

## MPI vs Shared-Memory Parallelism

MPI doesn't replace OpenMP or TBB — they solve different problems.

**OpenMP/TBB** parallelize work within a single process using shared memory and threads. They're limited to one machine (one NUMA domain in practice).

**MPI** parallelizes work across processes that may be on different machines. Each process has its own memory; communication is explicit.

**The standard HPC pattern is MPI+OpenMP hybrid:** MPI handles inter-node communication (one or a few ranks per node), and OpenMP handles intra-node parallelism (threads within each rank). This avoids the overhead of running hundreds of MPI ranks per node while still using all cores.

## Setup

### Installing and Building

**OpenMPI** (most common on Linux):

```bash
# Ubuntu/Debian
sudo apt install openmpi-bin libopenmpi-dev

# macOS
brew install open-mpi
```

**MPICH** (alternative implementation, ABI-compatible with OpenMPI in most cases):

```bash
sudo apt install mpich libmpich-dev
```

**CMake integration:**

```cmake
find_package(MPI REQUIRED)
add_executable(my_mpi_app main.cpp)
target_link_libraries(my_mpi_app PRIVATE MPI::MPI_CXX)
```

### Running

```bash
# run with 4 processes on local machine
mpirun -n 4 ./my_mpi_app

# run across multiple nodes (via hostfile)
mpirun -n 16 --hostfile hosts.txt ./my_mpi_app
```

### Python: mpi4py

```bash
pip install mpi4py

# run Python MPI program
mpirun -n 4 python my_script.py
```

```python
from mpi4py import MPI

comm = MPI.COMM_WORLD
rank = comm.Get_rank()
size = comm.Get_size()
print(f"I am rank {rank} of {size}")
```

## Basic Communication Model

### Initialization and Rank Discovery

Every MPI program follows this structure:

```cpp
#include <mpi.h>
#include <iostream>

int main(int argc, char** argv) {
    MPI_Init(&argc, &argv);

    int rank, size;
    MPI_Comm_rank(MPI_COMM_WORLD, &rank);  // which process am I?
    MPI_Comm_size(MPI_COMM_WORLD, &size);  // how many total?

    std::cout << "Rank " << rank << " of " << size << "\n";

    MPI_Finalize();
    return 0;
}
```

`MPI_COMM_WORLD` is the communicator that includes all processes. You can create sub-communicators for subsets of ranks, but `MPI_COMM_WORLD` is the starting point.

### Point-to-Point: Send and Recv

```cpp
if (rank == 0) {
    int data = 42;
    MPI_Send(&data, 1, MPI_INT, /*dest=*/1, /*tag=*/0, MPI_COMM_WORLD);
} else if (rank == 1) {
    int data;
    MPI_Recv(&data, 1, MPI_INT, /*source=*/0, /*tag=*/0,
             MPI_COMM_WORLD, MPI_STATUS_IGNORE);
    std::cout << "Received: " << data << "\n";
}
```

`MPI_Send` blocks until the message buffer is safe to reuse (not necessarily until the receiver has received it). `MPI_Recv` blocks until the message arrives.

**Deadlock trap:** if both ranks call `MPI_Send` before `MPI_Recv`, both block waiting for the other to receive. For large messages this always deadlocks; for small messages it may work due to internal buffering but is still incorrect:

```cpp
// DEADLOCK for large messages — both sides send before either receives
if (rank == 0) {
    MPI_Send(big_data, n, MPI_FLOAT, 1, 0, MPI_COMM_WORLD);
    MPI_Recv(buf, n, MPI_FLOAT, 1, 0, MPI_COMM_WORLD, MPI_STATUS_IGNORE);
} else {
    MPI_Send(big_data, n, MPI_FLOAT, 0, 0, MPI_COMM_WORLD);
    MPI_Recv(buf, n, MPI_FLOAT, 0, 0, MPI_COMM_WORLD, MPI_STATUS_IGNORE);
}
```

Fix: use `MPI_Sendrecv` which combines both operations, or use non-blocking calls.

### Non-Blocking Communication

`MPI_Isend` and `MPI_Irecv` return immediately. You can overlap computation with communication:

```cpp
MPI_Request req;
MPI_Irecv(buf, n, MPI_FLOAT, source, tag, MPI_COMM_WORLD, &req);

// do useful work while the message is in flight
compute_local_stuff();

MPI_Wait(&req, MPI_STATUS_IGNORE); // now block until recv completes
// buf is safe to read
```

Non-blocking communication is essential for performance in iterative solvers where each rank needs data from its neighbors. Start the receives, compute on local data, then wait for the boundary data.

## Collective Operations

Collectives are MPI's superpower — they express common communication patterns in a single call with optimized implementations (tree-based, ring-based, or hardware-accelerated).

### MPI_Bcast

Rank 0 sends the same data to all ranks:

```cpp
int data;
if (rank == 0) data = 42;
MPI_Bcast(&data, 1, MPI_INT, /*root=*/0, MPI_COMM_WORLD);
// all ranks now have data == 42
```

### MPI_Scatter and MPI_Gather

Distribute chunks of an array from root to all ranks, and collect them back:

```cpp
std::vector<float> all_data;
if (rank == 0) {
    all_data.resize(size * chunk_size);
    // fill all_data...
}

std::vector<float> local_chunk(chunk_size);

// root distributes equal chunks to each rank
MPI_Scatter(all_data.data(), chunk_size, MPI_FLOAT,
            local_chunk.data(), chunk_size, MPI_FLOAT,
            /*root=*/0, MPI_COMM_WORLD);

// each rank processes its chunk
process(local_chunk);

// collect results back to root
MPI_Gather(local_chunk.data(), chunk_size, MPI_FLOAT,
           all_data.data(), chunk_size, MPI_FLOAT,
           /*root=*/0, MPI_COMM_WORLD);
```

### MPI_Reduce and MPI_Allreduce

Compute a sum, max, min, or custom operation across all ranks:

```cpp
float local_sum = compute_local_sum();
float global_sum;

// result only on root (rank 0)
MPI_Reduce(&local_sum, &global_sum, 1, MPI_FLOAT, MPI_SUM,
           /*root=*/0, MPI_COMM_WORLD);

// result on ALL ranks (more commonly needed)
MPI_Allreduce(&local_sum, &global_sum, 1, MPI_FLOAT, MPI_SUM,
              MPI_COMM_WORLD);
```

`MPI_Allreduce` is the most important collective in practice. It's the core operation in distributed SGD (allreduce gradients across workers) and in iterative solvers (allreduce residual norms for convergence checks).

### MPI_Barrier

Synchronize all ranks — no rank proceeds until all have reached the barrier:

```cpp
MPI_Barrier(MPI_COMM_WORLD);
```

Use sparingly. Barriers are rarely needed when using other collectives correctly, and they serialize the computation. If you find yourself adding barriers to "fix timing issues," the real problem is usually a missing dependency or a mismatched send/recv pair.

## Worked Example: Parallel Array Sum

```cpp
#include <mpi.h>
#include <vector>
#include <numeric>
#include <iostream>

int main(int argc, char** argv) {
    MPI_Init(&argc, &argv);

    int rank, size;
    MPI_Comm_rank(MPI_COMM_WORLD, &rank);
    MPI_Comm_size(MPI_COMM_WORLD, &size);

    const int total_n = 1000000;
    const int chunk = total_n / size;

    std::vector<float> all_data;
    if (rank == 0) {
        all_data.resize(total_n);
        for (int i = 0; i < total_n; i++) all_data[i] = 1.0f;
    }

    // distribute chunks
    std::vector<float> local(chunk);
    MPI_Scatter(all_data.data(), chunk, MPI_FLOAT,
                local.data(), chunk, MPI_FLOAT, 0, MPI_COMM_WORLD);

    // local sum
    float local_sum = std::accumulate(local.begin(), local.end(), 0.0f);

    // global reduction
    float global_sum;
    MPI_Reduce(&local_sum, &global_sum, 1, MPI_FLOAT, MPI_SUM,
               0, MPI_COMM_WORLD);

    if (rank == 0) {
        std::cout << "Global sum: " << global_sum << "\n";
        // expected: 1000000.0
    }

    MPI_Finalize();
    return 0;
}
```

Compile and run:

```bash
mpicxx -O2 -o parallel_sum parallel_sum.cpp
mpirun -n 4 ./parallel_sum
```

## MPI+OpenMP Hybrid

The standard HPC pattern: one or a few MPI ranks per node, each spawning OpenMP threads to use all cores:

```cpp
#include <mpi.h>
#include <omp.h>

int main(int argc, char** argv) {
    int provided;
    MPI_Init_thread(&argc, &argv, MPI_THREAD_FUNNELED, &provided);
    // MPI_THREAD_FUNNELED: only the main thread makes MPI calls
    // MPI_THREAD_MULTIPLE: any thread can make MPI calls (higher overhead)

    if (provided < MPI_THREAD_FUNNELED) {
        // MPI doesn't support threading at this level — fall back
        MPI_Abort(MPI_COMM_WORLD, 1);
    }

    int rank;
    MPI_Comm_rank(MPI_COMM_WORLD, &rank);

    #pragma omp parallel
    {
        int tid = omp_get_thread_num();
        printf("Rank %d, thread %d\n", rank, tid);
    }

    // MPI communication on main thread only (FUNNELED)
    MPI_Barrier(MPI_COMM_WORLD);

    MPI_Finalize();
    return 0;
}
```

**Thread safety levels:** `MPI_THREAD_SINGLE` (no threads), `MPI_THREAD_FUNNELED` (only main thread calls MPI), `MPI_THREAD_SERIALIZED` (any thread but one at a time), `MPI_THREAD_MULTIPLE` (any thread, any time). `FUNNELED` is the practical sweet spot — it covers the common pattern and has minimal overhead.

**Rank mapping:** bind one MPI rank per NUMA socket, and let OpenMP threads use the cores on that socket. This avoids cross-socket memory traffic:

```bash
mpirun -n 2 --map-by socket --bind-to socket \
    -x OMP_NUM_THREADS=16 -x OMP_PLACES=cores \
    ./hybrid_app
```

## Python with mpi4py

mpi4py wraps MPI with Pythonic interfaces. Lowercase methods (`send`, `recv`) pickle Python objects. Uppercase methods (`Send`, `Recv`) work with NumPy arrays directly (zero-copy, much faster):

```python
from mpi4py import MPI
import numpy as np

comm = MPI.COMM_WORLD
rank = comm.Get_rank()
size = comm.Get_size()

# fast NumPy array scatter/gather
if rank == 0:
    data = np.arange(size * 100, dtype=np.float64).reshape(size, 100)
else:
    data = None

local = np.empty(100, dtype=np.float64)
comm.Scatter(data, local, root=0)

# local computation
local_sum = local.sum()

# allreduce
global_sum = comm.allreduce(local_sum, op=MPI.SUM)
print(f"Rank {rank}: global sum = {global_sum}")
```

**Performance note:** uppercase methods (`Scatter`, `Gather`, `Bcast`, `Reduce`) pass NumPy arrays through MPI directly without serialization. Lowercase methods (`scatter`, `gather`, `bcast`, `reduce`) pickle Python objects — 10-100x slower for numerical data. Always use uppercase methods with NumPy arrays in production.

## Cluster Setup

### SSH Key Distribution

MPI launches processes on remote nodes via SSH. Every node must accept passwordless SSH from the head node:

```bash
# on the head node
ssh-keygen -t ed25519
ssh-copy-id user@node01
ssh-copy-id user@node02
# ... for all nodes
```

### Hostfile

Tell `mpirun` which nodes to use and how many processes per node:

```
# hosts.txt
node01 slots=32
node02 slots=32
node03 slots=32
node04 slots=32
```

```bash
mpirun -n 64 --hostfile hosts.txt --map-by node ./my_app
```

### SLURM Integration

On managed clusters, SLURM replaces `mpirun`. Use `srun` instead:

```bash
#!/bin/bash
#SBATCH --job-name=my_mpi_job
#SBATCH --nodes=4
#SBATCH --ntasks-per-node=2
#SBATCH --cpus-per-task=16
#SBATCH --time=01:00:00

module load openmpi

export OMP_NUM_THREADS=$SLURM_CPUS_PER_TASK
srun ./hybrid_app
```

`srun` handles process placement and does not need a hostfile — SLURM provides the node list.

## Gotchas

**Matching Send/Recv counts.** The receive buffer must be at least as large as the sent data. Mismatches cause segfaults or hangs that are extremely hard to debug.

**Eager vs rendezvous protocol.** Small messages (typically under 16-64 KB) are sent eagerly — buffered internally, Send returns immediately. Large messages use the rendezvous protocol — the sender and receiver handshake first, then transfer directly. This threshold is implementation-specific and explains why small-message code sometimes "works" even with incorrect ordering.

**Serialization overhead.** Avoid sending complex C++ objects (std::map, std::string). Pack data into contiguous buffers (flat arrays) or use `MPI_Type_create_struct` for custom types.

**MPI vs distributed frameworks.** For Python data processing, consider Ray or Dask before MPI. They handle scheduling, fault tolerance, and dynamic task graphs automatically. MPI is the right choice for tightly-coupled numerical simulations where processes communicate every iteration and latency matters. For embarrassingly parallel or loosely-coupled workloads, Ray's overhead is negligible and its developer experience is vastly better.

**Error handling.** By default, MPI aborts the entire application on any error. For more graceful handling:

```cpp
MPI_Comm_set_errhandler(MPI_COMM_WORLD, MPI_ERRORS_RETURN);
int err = MPI_Send(...);
if (err != MPI_SUCCESS) {
    char msg[MPI_MAX_ERROR_STRING];
    int len;
    MPI_Error_string(err, msg, &len);
    std::cerr << "MPI error: " << msg << "\n";
}
```
