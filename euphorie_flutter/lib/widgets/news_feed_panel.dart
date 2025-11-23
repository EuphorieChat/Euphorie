import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/app_state.dart';
import '../services/news_service.dart';

class NewsFeedPanel extends StatefulWidget {
  const NewsFeedPanel({super.key});

  @override
  State<NewsFeedPanel> createState() => _NewsFeedPanelState();
}

class _NewsFeedPanelState extends State<NewsFeedPanel> {
  final ScrollController _scrollController = ScrollController();
  Timer? _autoScrollTimer;
  bool _isAutoScrolling = true;

    @override
    void initState() {
    super.initState();
    // Start autoscroll after 3 seconds
    Future.delayed(const Duration(seconds: 3), () {
        if (mounted) _startAutoScroll();
    });
    }

    @override
    void dispose() {
    _autoScrollTimer?.cancel();
    _scrollController.dispose();
    super.dispose();
    }

    void _startAutoScroll() {
    if (!_scrollController.hasClients) return;
    
    _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(seconds: 30),
        curve: Curves.linear,
    );
    }

  void _autoScroll() {
    if (!_scrollController.hasClients || !_isAutoScrolling || !mounted) return;

    const scrollSpeed = 30.0; // pixels per second
    final maxScroll = _scrollController.position.maxScrollExtent;
    final currentScroll = _scrollController.offset;
    final distance = maxScroll - currentScroll;
    
    if (distance > 0) {
      final duration = Duration(milliseconds: (distance / scrollSpeed * 1000).round());
      
      _scrollController.animateTo(
        maxScroll,
        duration: duration,
        curve: Curves.linear,
      ).then((_) {
        // After reaching the end, wait 3 seconds and scroll back to top
        if (_isAutoScrolling && mounted) {
          Future.delayed(const Duration(seconds: 3), () {
            if (_isAutoScrolling && mounted && _scrollController.hasClients) {
              _scrollController.animateTo(
                0,
                duration: const Duration(seconds: 2),
                curve: Curves.easeInOut,
              ).then((_) {
                // Start again after reaching top
                if (_isAutoScrolling && mounted) {
                  Future.delayed(const Duration(seconds: 2), _autoScroll);
                }
              });
            }
          });
        }
      });
    }
  }

  void _pauseAutoScroll() {
    setState(() {
      _isAutoScrolling = false;
    });
    _autoScrollTimer?.cancel();
  }

  void _resumeAutoScroll() {
    setState(() {
      _isAutoScrolling = true;
    });
    _startAutoScroll();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AppState>(
      builder: (context, appState, _) {
        return AnimatedPositioned(
          duration: const Duration(milliseconds: 300),  // Reduced from 400ms
          curve: Curves.easeInOut,
          top: 0,
          bottom: 0,
          right: appState.isNewsFeedOpen ? 0 : -380,
          child: GestureDetector(
            onTap: () {}, // Prevent closing when tapping inside
            child: Container(
              width: 360,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Color(0xFF0F0023),
                    Color(0xFF1E0A32),
                    Color(0xFF140528),
                  ],
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.8),
                    blurRadius: 60,
                    offset: const Offset(-20, 0),
                  ),
                ],
              ),
              child: SafeArea(
                child: Column(
                  children: [
                    _buildHeader(appState),
                    Expanded(
                      child: Consumer<NewsService>(
                        builder: (context, newsService, _) {
                          if (newsService.isLoading) {
                            return const Center(
                              child: CircularProgressIndicator(
                                color: Color(0xFF8B5CF6),
                              ),
                            );
                          }

                          if (newsService.error != null) {
                            return Center(
                              child: Padding(
                                padding: const EdgeInsets.all(24),
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.error_outline,
                                      size: 48,
                                      color: Colors.red.withOpacity(0.7),
                                    ),
                                    const SizedBox(height: 16),
                                    Text(
                                      newsService.error!,
                                      style: TextStyle(
                                        color: Colors.white.withOpacity(0.7),
                                        fontSize: 14,
                                      ),
                                      textAlign: TextAlign.center,
                                    ),
                                    const SizedBox(height: 24),
                                    ElevatedButton(
                                      onPressed: () => newsService.refresh(),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: const Color(0xFF8B5CF6),
                                      ),
                                      child: const Text('Retry'),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          }

                          return NotificationListener<ScrollNotification>(
                            onNotification: (notification) {
                              if (notification is ScrollStartNotification) {
                                _pauseAutoScroll();
                              } else if (notification is ScrollEndNotification) {
                                // Resume autoscroll 5 seconds after user stops scrolling
                                Future.delayed(const Duration(seconds: 5), () {
                                  if (mounted) _resumeAutoScroll();
                                });
                              }
                              return true;
                            },
                            child: RefreshIndicator(
                              onRefresh: newsService.refresh,
                              color: const Color(0xFF8B5CF6),
                              child: ListView.builder(
                                controller: _scrollController,
                                physics: const BouncingScrollPhysics(),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 16,
                                ),
                                itemCount: newsService.articles.length,
                                itemBuilder: (context, index) {
                                  final article = newsService.articles[index];
                                  return _buildArticleCard(article);
                                },
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildHeader(AppState appState) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(
            color: Colors.white.withOpacity(0.1),
            width: 1,
          ),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ShaderMask(
                shaderCallback: (bounds) => const LinearGradient(
                  colors: [Color(0xFFA78BFA), Color(0xFF60A5FA)],
                ).createShader(bounds),
                child: const Text(
                  'News Feed',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                  ),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'from Crene',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.white.withOpacity(0.6),
                ),
              ),
            ],
          ),
          GestureDetector(
            onTap: () => appState.toggleNewsFeed(),
            child: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: const Color(0xFF8B5CF6).withOpacity(0.2),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: const Color(0xFF8B5CF6).withOpacity(0.5),
                  width: 1,
                ),
              ),
              child: const Icon(
                Icons.close,
                color: Color(0xFFA78BFA),
                size: 24,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildArticleCard(NewsArticle article) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            const Color(0xFF8B5CF6).withOpacity(0.1),
            const Color(0xFF3B82F6).withOpacity(0.1),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: const Color(0xFF8B5CF6).withOpacity(0.3),
          width: 1,
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _launchUrl(article.url),
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (article.imageUrl != null) ...[
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.network(
                      article.imageUrl!,
                      height: 180,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        return Container(
                          height: 180,
                          decoration: BoxDecoration(
                            color: const Color(0xFF8B5CF6).withOpacity(0.2),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(
                            Icons.image_not_supported,
                            color: Color(0xFFA78BFA),
                            size: 48,
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
                Text(
                  article.title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    height: 1.3,
                  ),
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                ),
                if (article.summary != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    article.summary!,
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.7),
                      fontSize: 13,
                      height: 1.4,
                    ),
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                if (article.publishedAt != null) ...[
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Icon(
                        Icons.access_time,
                        size: 14,
                        color: const Color(0xFFA78BFA).withOpacity(0.7),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        _formatDate(article.publishedAt!),
                        style: TextStyle(
                          color: const Color(0xFFA78BFA).withOpacity(0.7),
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _formatDate(String dateStr) {
    try {
      final date = DateTime.parse(dateStr);
      final now = DateTime.now();
      final difference = now.difference(date);

      if (difference.inDays > 0) {
        return '${difference.inDays}d ago';
      } else if (difference.inHours > 0) {
        return '${difference.inHours}h ago';
      } else {
        return '${difference.inMinutes}m ago';
      }
    } catch (e) {
      return dateStr;
    }
  }

  Future<void> _launchUrl(String? url) async {
    if (url == null) return;
    
    try {
      final uri = Uri.parse(url);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    } catch (e) {
      print('Error launching URL: $e');
    }
  }
}