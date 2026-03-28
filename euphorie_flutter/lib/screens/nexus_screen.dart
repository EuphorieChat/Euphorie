import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';

const _bg = Color(0xFF06080c);
const _bg2 = Color(0xFF0c1018);
const _bg3 = Color(0xFF111820);
const _border = Color(0xFF1a2233);
const _accent = Color(0xFF6ee7b7);
const _accentDim = Color(0x0F6ee7b7);
const _text = Color(0xFFe8ecf2);
const _dim = Color(0xFF5a6a80);
const _muted = Color(0xFF2a3648);
const _danger = Color(0xFFfb7185);

class NexusScreen extends StatefulWidget {
  final String? token;
  final VoidCallback? onBack;
  const NexusScreen({super.key, this.token, this.onBack});

  @override
  State<NexusScreen> createState() => _NexusScreenState();
}

class _NexusScreenState extends State<NexusScreen> {
  final _inputCtl = TextEditingController();
  final _dio = Dio(BaseOptions(
    baseUrl: 'https://euphorie.com',
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 120),
  ));
  bool _loading = false;
  String _loadingMsg = 'Analyzing requirements...';
  Map<String, dynamic>? _result;
  String? _error;

  final _examples = [
    'CRM for 20 people under \$15k with Slack integration',
    'Project management for 50 engineers with GitHub, under \$20k',
    'Design tool for 10 people with prototyping, budget \$8k',
    'Customer support for 30 agents with live chat, under \$20k',
    'Email marketing for 5000 subscribers under \$3k',
  ];

  Future<void> _submit() async {
    final q = _inputCtl.text.trim();
    if (q.isEmpty || _loading) return;
    setState(() { _loading = true; _result = null; _error = null; _loadingMsg = 'Analyzing requirements...'; });

    // Cycle through loading messages
    final steps = ['Spawning research agents...', 'Researching vendors...', 'Analyzing pricing...', 'Comparing options...', 'Generating recommendation...'];
    int si = 0;
    final timer = Stream.periodic(const Duration(seconds: 7), (i) => i).listen((_) {
      if (si < steps.length && mounted) setState(() => _loadingMsg = steps[si++]);
    });

    try {
      final res = await _dio.post('/api/nexus/procure/',
        data: {'query': q},
        options: Options(headers: {'Authorization': 'Bearer ${widget.token}', 'Content-Type': 'application/json'}),
      );
      if (res.statusCode == 200 && res.data['status'] == 'completed') {
        setState(() { _result = res.data; _loading = false; });
      } else {
        setState(() { _error = res.data['error'] ?? 'Something went wrong'; _loading = false; });
      }
    } on DioException catch (e) {
      setState(() { _error = e.response?.data?['error'] ?? 'Network error. Please try again.'; _loading = false; });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    } finally {
      timer.cancel();
    }
  }

  void _newSearch() {
    setState(() { _result = null; _error = null; _inputCtl.clear(); });
  }

  @override
  void dispose() { _inputCtl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      body: SafeArea(child: Column(children: [
        // Header
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: _border))),
          child: Row(children: [
            if (widget.onBack != null)
              GestureDetector(onTap: widget.onBack, child: const Padding(
                padding: EdgeInsets.only(right: 14),
                child: Icon(Icons.arrow_back_ios, size: 18, color: _dim),
              )),
            const Text('Nexus', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: _text)),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
              decoration: BoxDecoration(color: _accentDim, borderRadius: BorderRadius.circular(6), border: Border.all(color: Color(0x266ee7b7))),
              child: const Text('Procurement', style: TextStyle(fontSize: 11, color: _accent, fontWeight: FontWeight.w500)),
            ),
          ]),
        ),
        // Body
        Expanded(child: _loading ? _buildLoading() : _result != null ? _buildResults() : _buildQuery()),
      ])),
    );
  }

  Widget _buildQuery() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(crossAxisAlignment: CrossAxisAlignment.center, children: [
        const SizedBox(height: 40),
        const Text('Find better software.', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w700, color: _text), textAlign: TextAlign.center),
        RichText(text: const TextSpan(children: [
          TextSpan(text: 'Spend ', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w700, color: _text)),
          TextSpan(text: 'less.', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w700, color: _accent)),
        ])),
        const SizedBox(height: 12),
        const Text('Tell us what you need. Our AI compares vendors,\npricing, and features in seconds.', style: TextStyle(fontSize: 14, color: _dim, height: 1.6), textAlign: TextAlign.center),
        const SizedBox(height: 32),
        // Input
        Container(
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(14), border: Border.all(color: _border), color: _bg2),
          child: Column(children: [
            TextField(
              controller: _inputCtl,
              maxLines: 3, minLines: 2,
              style: const TextStyle(fontSize: 15, color: _text, height: 1.5),
              cursorColor: _accent,
              decoration: const InputDecoration(
                hintText: 'e.g. We need a CRM for 20 people under \$15k with SOC 2...',
                hintStyle: TextStyle(color: _muted, fontSize: 14),
                border: InputBorder.none,
                contentPadding: EdgeInsets.all(16),
              ),
              onSubmitted: (_) => _submit(),
            ),
            Container(
              padding: const EdgeInsets.fromLTRB(8, 0, 8, 8),
              child: Row(children: [
                const Spacer(),
                GestureDetector(
                  onTap: _submit,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                    decoration: BoxDecoration(color: _accent, borderRadius: BorderRadius.circular(10)),
                    child: const Text('Search', style: TextStyle(color: _bg, fontSize: 14, fontWeight: FontWeight.w600)),
                  ),
                ),
              ]),
            ),
          ]),
        ),
        if (_error != null) Padding(
          padding: const EdgeInsets.only(top: 12),
          child: Text(_error!, style: const TextStyle(color: _danger, fontSize: 13)),
        ),
        const SizedBox(height: 20),
        // Example chips
        Wrap(spacing: 8, runSpacing: 8, alignment: WrapAlignment.center, children: _examples.map((e) =>
          GestureDetector(
            onTap: () { _inputCtl.text = e; },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(borderRadius: BorderRadius.circular(8), border: Border.all(color: _border)),
              child: Text(e.length > 30 ? '${e.substring(0, 30)}...' : e, style: const TextStyle(fontSize: 12, color: _dim)),
            ),
          ),
        ).toList()),
      ]),
    );
  }

  Widget _buildLoading() {
    return Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
      const SizedBox(width: 48, height: 48, child: CircularProgressIndicator(strokeWidth: 2, color: _accent)),
      const SizedBox(height: 24),
      Text(_loadingMsg, style: const TextStyle(fontSize: 14, color: _dim)),
    ]));
  }

  Widget _buildResults() {
    final recs = (_result?['recommendations'] as List?) ?? [];
    final savings = (_result?['estimated_savings'] ?? 0).toDouble();
    final bestPick = _result?['best_pick'] ?? '';
    final summary = _result?['summary'] ?? '';
    final clones = _result?['clones_spawned'] ?? 0;
    final time = (_result?['processing_time'] ?? 0).toDouble();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Savings banner
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            gradient: const LinearGradient(colors: [Color(0x146ee7b7), Color(0x0834d399)]),
            border: Border.all(color: const Color(0x266ee7b7)),
          ),
          child: Column(children: [
            Text('\$${savings.toStringAsFixed(0)}', style: const TextStyle(fontSize: 36, fontWeight: FontWeight.w700, color: _accent)),
            const Text('estimated annual savings', style: TextStyle(fontSize: 13, color: _dim)),
          ]),
        ),
        const SizedBox(height: 16),
        Text('Best pick: $bestPick', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: _text)),
        const SizedBox(height: 4),
        Text('$clones agents, ${time.toStringAsFixed(0)}s', style: const TextStyle(fontSize: 12, color: _muted)),
        const SizedBox(height: 12),
        Text(summary, style: const TextStyle(fontSize: 14, color: _dim, height: 1.7)),
        const SizedBox(height: 20),

        // Vendor cards
        ...recs.asMap().entries.map((entry) {
          final i = entry.key;
          final r = entry.value as Map<String, dynamic>;
          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: _bg2,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: i == 0 ? const Color(0x336ee7b7) : _border),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(r['name'] ?? '', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: _text)),
                  if (r['product'] != null) Text(r['product'], style: const TextStyle(fontSize: 12, color: _dim)),
                ])),
                Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                  Text('\$${(r['pricing_per_seat_monthly'] ?? 0).toStringAsFixed(0)}/seat/mo', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: _accent)),
                  Text('\$${(r['pricing_total_annual'] ?? 0).toStringAsFixed(0)}/yr', style: const TextStyle(fontSize: 11, color: _muted)),
                ]),
              ]),
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                decoration: BoxDecoration(color: _accentDim, borderRadius: BorderRadius.circular(6)),
                child: Text('${((r['confidence_score'] ?? 0) * 100).toStringAsFixed(0)}% confidence', style: const TextStyle(fontSize: 11, color: _accent)),
              ),
              if (r['pros'] != null && (r['pros'] as List).isNotEmpty) ...[
                const SizedBox(height: 10),
                const Text('Pros', style: TextStyle(fontSize: 10, color: _muted, fontWeight: FontWeight.w600, letterSpacing: 1)),
                const SizedBox(height: 4),
                ...(r['pros'] as List).take(3).map((p) => Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: Text('+ $p', style: const TextStyle(fontSize: 12, color: _dim, height: 1.5)),
                )),
              ],
              if (r['cons'] != null && (r['cons'] as List).isNotEmpty) ...[
                const SizedBox(height: 8),
                const Text('Cons', style: TextStyle(fontSize: 10, color: _muted, fontWeight: FontWeight.w600, letterSpacing: 1)),
                const SizedBox(height: 4),
                ...(r['cons'] as List).take(2).map((c) => Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: Text('- $c', style: const TextStyle(fontSize: 12, color: _dim, height: 1.5)),
                )),
              ],
              if (r['negotiation_leverage'] != null && (r['negotiation_leverage'] as List).isNotEmpty) ...[
                const SizedBox(height: 8),
                const Text('Leverage', style: TextStyle(fontSize: 10, color: _muted, fontWeight: FontWeight.w600, letterSpacing: 1)),
                const SizedBox(height: 4),
                ...(r['negotiation_leverage'] as List).take(2).map((l) => Text(l.toString(), style: const TextStyle(fontSize: 12, color: _accent, height: 1.5))),
              ],
            ]),
          );
        }),

        // New search button
        const SizedBox(height: 8),
        GestureDetector(
          onTap: _newSearch,
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 14),
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), border: Border.all(color: _border)),
            child: const Center(child: Text('New search', style: TextStyle(fontSize: 14, color: _text))),
          ),
        ),
      ]),
    );
  }
}
