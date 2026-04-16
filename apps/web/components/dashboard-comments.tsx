"use client"

import * as React from "react"
import { MessageCircle, Send, Check, X, Reply } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

interface Comment {
  id: string
  section_id: string
  user_id: string
  user_name: string | null
  content: string
  parent_id: string | null
  resolved: boolean
  created_at: string
}

interface SectionCommentsProps {
  jobId: string
  sectionId: string
}

export function SectionCommentButton({ jobId, sectionId }: SectionCommentsProps) {
  const [open, setOpen] = React.useState(false)
  const [comments, setComments] = React.useState<Comment[]>([])
  const [newComment, setNewComment] = React.useState("")
  const [replyTo, setReplyTo] = React.useState<string | null>(null)
  const [sending, setSending] = React.useState(false)
  const [count, setCount] = React.useState(0)

  // Load comments for this section
  const loadComments = React.useCallback(async () => {
    const { data } = await supabase
      .from("dashboard_comments")
      .select("*")
      .eq("job_id", jobId)
      .eq("section_id", sectionId)
      .order("created_at", { ascending: true })
    if (data) {
      setComments(data)
      setCount(data.filter((c: Comment) => !c.parent_id && !c.resolved).length)
    }
  }, [jobId, sectionId])

  React.useEffect(() => {
    loadComments()
  }, [loadComments])

  const handleSend = async () => {
    if (!newComment.trim() || sending) return
    setSending(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSending(false); return }

    await supabase.from("dashboard_comments").insert({
      job_id: jobId,
      section_id: sectionId,
      user_id: user.id,
      user_name: user.email?.split("@")[0] ?? "User",
      content: newComment.trim(),
      parent_id: replyTo,
    })

    setNewComment("")
    setReplyTo(null)
    setSending(false)
    await loadComments()
  }

  const handleResolve = async (commentId: string) => {
    await supabase
      .from("dashboard_comments")
      .update({ resolved: true, updated_at: new Date().toISOString() })
      .eq("id", commentId)
    await loadComments()
  }

  const topLevel = comments.filter((c) => !c.parent_id)
  const getReplies = (parentId: string) => comments.filter((c) => c.parent_id === parentId)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 opacity-0 group-hover/drag:opacity-60 hover:!opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
        title="Comments"
      >
        <MessageCircle className="w-3.5 h-3.5" />
        {count > 0 && <span className="text-[10px] font-medium">{count}</span>}
      </button>
    )
  }

  return (
    <div className="mx-4 lg:mx-6 mt-1 mb-2 rounded-lg border border-border bg-card p-3 animate-in slide-in-from-top-2 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">Comments</span>
          {count > 0 && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{count}</Badge>}
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setOpen(false)}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Comment thread */}
      {topLevel.length > 0 ? (
        <div className="flex flex-col gap-2 mb-3 max-h-48 overflow-y-auto">
          {topLevel.map((comment) => (
            <div key={comment.id} className={`text-xs ${comment.resolved ? 'opacity-50' : ''}`}>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[9px] font-semibold text-primary">
                    {(comment.user_name ?? "U")[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{comment.user_name ?? "User"}</span>
                    <span className="text-muted-foreground">
                      {new Date(comment.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-foreground/80 mt-0.5">{comment.content}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {!comment.resolved && (
                      <>
                        <button
                          onClick={() => setReplyTo(comment.id)}
                          className="text-muted-foreground hover:text-foreground flex items-center gap-1"
                        >
                          <Reply className="w-3 h-3" /> Reply
                        </button>
                        <button
                          onClick={() => handleResolve(comment.id)}
                          className="text-muted-foreground hover:text-emerald-400 flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" /> Resolve
                        </button>
                      </>
                    )}
                    {comment.resolved && (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Resolved
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {/* Replies */}
              {getReplies(comment.id).map((reply) => (
                <div key={reply.id} className="ml-7 mt-1.5 flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[8px] font-semibold text-muted-foreground">
                      {(reply.user_name ?? "U")[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">{reply.user_name}</span>
                    <span className="text-muted-foreground ml-2">
                      {new Date(reply.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </span>
                    <p className="text-foreground/80 mt-0.5">{reply.content}</p>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground mb-3">No comments yet. Be the first to annotate this section.</p>
      )}

      {/* Input */}
      {replyTo && (
        <div className="flex items-center gap-1 mb-1 text-[10px] text-muted-foreground">
          <Reply className="w-3 h-3" />
          Replying to comment
          <button onClick={() => setReplyTo(null)} className="text-foreground hover:text-destructive ml-1">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSend() }}
          placeholder={replyTo ? "Write a reply..." : "Add a comment..."}
          className="h-8 text-xs"
        />
        <Button
          size="sm"
          className="h-8 w-8 p-0 shrink-0"
          onClick={handleSend}
          disabled={!newComment.trim() || sending}
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}
