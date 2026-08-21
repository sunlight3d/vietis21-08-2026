import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/task.dart';
import '../services/api_service.dart';
import 'login_screen.dart';
import 'chat_screen.dart';

class TaskListScreen extends StatefulWidget {
  const TaskListScreen({super.key});

  @override
  State<TaskListScreen> createState() => _TaskListScreenState();
}

class _TaskListScreenState extends State<TaskListScreen> {
  final ApiService _apiService = ApiService();
  final ScrollController _scrollController = ScrollController();
  List<Task> _tasks = [];
  bool _isLoading = true;
  bool _isLoadingMore = false;
  int _page = 1;
  final int _limit = 10;
  bool _hasMore = true;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    _loadTasks();
    _subscribeToSSE();
  }

  void _subscribeToSSE() async {
    try {
      final request = http.Request('GET', Uri.parse('${ApiService.baseUrl.replaceAll("/tasks", "")}/stream'));
      final response = await http.Client().send(request);
      
      response.stream.transform(utf8.decoder).transform(const LineSplitter()).listen((line) {
        if (line.startsWith('data: ')) {
          try {
            final data = json.decode(line.substring(6));
            if (data['type'] == 'TASK_CHANGED') {
              _loadTasks();
            }
          } catch (e) {
            debugPrint('Error parsing SSE data: $e');
          }
        }
      }, onError: (err) {
        debugPrint('SSE Stream Error: $err');
        // reconnect after a delay
        Future.delayed(const Duration(seconds: 5), _subscribeToSSE);
      });
    } catch (e) {
      debugPrint('SSE Connection Error: $e');
      Future.delayed(const Duration(seconds: 5), _subscribeToSSE);
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 200 &&
        !_isLoadingMore &&
        _hasMore) {
      _loadMoreTasks();
    }
  }

  Future<void> _loadTasks() async {
    setState(() {
      _isLoading = true;
      _page = 1;
      _hasMore = true;
    });
    try {
      final tasks = await _apiService.fetchTasks(page: _page, limit: _limit);
      setState(() {
        _tasks = tasks;
        _isLoading = false;
        if (tasks.length < _limit) _hasMore = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Lỗi tải dữ liệu: $e')),
        );
      }
    }
  }

  Future<void> _loadMoreTasks() async {
    setState(() => _isLoadingMore = true);
    try {
      _page++;
      final moreTasks = await _apiService.fetchTasks(page: _page, limit: _limit);
      setState(() {
        if (moreTasks.isEmpty) {
          _hasMore = false;
        } else {
          _tasks.addAll(moreTasks);
          if (moreTasks.length < _limit) _hasMore = false;
        }
        _isLoadingMore = false;
      });
    } catch (e) {
      setState(() => _isLoadingMore = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Lỗi tải thêm dữ liệu: $e')),
        );
      }
    }
  }

  Future<void> _addTask(String title) async {
    try {
      await _apiService.createTask(title);
      _loadTasks();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Lỗi thêm công việc: $e')),
        );
      }
    }
  }

  Future<void> _deleteTask(String id) async {
    try {
      await _apiService.deleteTask(id);
      _loadTasks();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Lỗi xoá công việc: $e')),
        );
      }
    }
  }

  Future<void> _toggleTask(String id, bool completed) async {
    try {
      await _apiService.updateTask(id, completed);
      _loadTasks();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Lỗi cập nhật công việc: $e')),
        );
      }
    }
  }

  void _showAddTaskDialog() {
    final TextEditingController controller = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Thêm công việc'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(hintText: 'Nhập tên công việc'),
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: () {
              final text = controller.text.trim();
              if (text.isNotEmpty) {
                _addTask(text);
                Navigator.pop(context);
              }
            },
            child: const Text('Thêm'),
          ),
        ],
      ),
    );
  }

  void _logout() async {
    await ApiService.logout();
    if (!mounted) return;
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (context) => const LoginScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Danh sách công việc'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        actions: [
          IconButton(
            icon: const Icon(Icons.chat),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const ChatScreen()),
              );
            },
            tooltip: 'Trò chuyện với AI',
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadTasks,
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: _logout,
            tooltip: 'Đăng xuất',
          )
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadTasks,
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _tasks.isEmpty
                ? ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: [
                      SizedBox(
                        height: MediaQuery.of(context).size.height * 0.8,
                        child: const Center(child: Text('Chưa có công việc nào.')),
                      ),
                    ],
                  )
                : ListView.builder(
                    controller: _scrollController,
                    physics: const AlwaysScrollableScrollPhysics(),
                    itemCount: _tasks.length + (_hasMore ? 1 : 0),
                    itemBuilder: (context, index) {
                      if (index == _tasks.length) {
                        return const Padding(
                          padding: EdgeInsets.all(16.0),
                          child: Center(child: CircularProgressIndicator()),
                        );
                      }

                      final task = _tasks[index];
                      final dateStr = DateFormat('dd/MM/yyyy HH:mm:ss').format(task.createdAt.toLocal());
                      
                      return Dismissible(
                        key: Key(task.id),
                        direction: DismissDirection.endToStart,
                        background: Container(
                          color: Colors.red,
                          alignment: Alignment.centerRight,
                          padding: const EdgeInsets.symmetric(horizontal: 20),
                          child: const Icon(Icons.delete, color: Colors.white),
                        ),
                        onDismissed: (direction) {
                          _deleteTask(task.id);
                        },
                        child: Container(
                          color: index.isEven ? Colors.blue.withOpacity(0.05) : Colors.transparent,
                          child: ListTile(
                            leading: Checkbox(
                              value: task.completed,
                              onChanged: (val) {
                                if (val != null) {
                                  _toggleTask(task.id, val);
                                }
                              },
                            ),
                            title: Text(
                              task.title,
                              maxLines: 3,
                              overflow: TextOverflow.ellipsis,
                            ),
                            subtitle: Text(dateStr),
                            trailing: IconButton(
                              icon: const Icon(Icons.delete, color: Colors.red),
                              onPressed: () => _deleteTask(task.id),
                            ),
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => TaskDetailScreen(task: task),
                                ),
                              );
                            },
                          ),
                        ),
                      );
                    },
                  ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddTaskDialog,
        tooltip: 'Thêm công việc',
        child: const Icon(Icons.add),
      ),
    );
  }
}

class TaskDetailScreen extends StatelessWidget {
  final Task task;

  const TaskDetailScreen({super.key, required this.task});

  @override
  Widget build(BuildContext context) {
    final dateStr = DateFormat('dd/MM/yyyy HH:mm:ss').format(task.createdAt.toLocal());
    return Scaffold(
      appBar: AppBar(
        title: const Text('Chi tiết công việc'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Tiêu đề:',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.grey),
            ),
            const SizedBox(height: 8),
            Text(
              task.title,
              style: const TextStyle(fontSize: 20),
            ),
            const SizedBox(height: 24),
            const Text(
              'Trạng thái:',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.grey),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(
                  task.completed ? Icons.check_circle : Icons.pending,
                  color: task.completed ? Colors.green : Colors.orange,
                ),
                const SizedBox(width: 8),
                Text(
                  task.completed ? 'Đã hoàn thành' : 'Đang xử lý',
                  style: const TextStyle(fontSize: 18),
                ),
              ],
            ),
            const SizedBox(height: 24),
            const Text(
              'Ngày tạo:',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.grey),
            ),
            const SizedBox(height: 8),
            Text(
              dateStr,
              style: const TextStyle(fontSize: 18),
            ),
          ],
        ),
      ),
    );
  }
}
