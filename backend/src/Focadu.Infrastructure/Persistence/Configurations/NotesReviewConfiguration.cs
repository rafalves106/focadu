using Focadu.Domain.Notes;
using Focadu.Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Focadu.Infrastructure.Persistence.Configurations;

public class NotesReviewConfiguration : IEntityTypeConfiguration<NotesReview>
{
    public void Configure(EntityTypeBuilder<NotesReview> builder)
    {
        builder.ToTable("NotesReviews");
        builder.HasKey(r => r.Id);

        builder.Property(r => r.UserId).IsRequired();
        builder.Property(r => r.DailyId).IsRequired();
        builder.Property(r => r.NotesHash).IsRequired().HasMaxLength(64);
        builder.Property(r => r.NoteCount).IsRequired();
        builder.Property(r => r.Strengths).IsRequired().HasMaxLength(NotesReview.MaxTextLength);
        builder.Property(r => r.Missing).IsRequired().HasMaxLength(NotesReview.MaxTextLength);
        builder.Property(r => r.MaterialCheck).IsRequired().HasMaxLength(NotesReview.MaxTextLength);
        builder.Property(r => r.CreatedAt).IsRequired();

        // Usuario apagado leva as revisoes junto. DailyId sem FK, igual Notes.DailyId (ver NoteConfiguration).
        builder.HasOne<User>().WithMany().HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(r => new { r.UserId, r.DailyId });
        builder.HasIndex(r => new { r.UserId, r.CreatedAt });
    }
}
