import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  InteractionType,
  ChannelType,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js"

const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.DISCORD_CLIENT_ID,
  guildId: process.env.DISCORD_GUILD_ID,
  channelId: process.env.DISCORD_CHANNEL_ID,
  webhookUrl: process.env.DISCORD_WEBHOOK_URL,
  vouchWebhookUrl: process.env.DISCORD_VOUCH_WEBHOOK_URL,
  vouchChannelId: process.env.DISCORD_VOUCH_CHANNEL_ID,
  ticketCategoryId: process.env.DISCORD_TICKET_CATEGORY_ID,
  supportRoleId: process.env.DISCORD_SUPPORT_ROLE_ID,
  ownerRoleId: process.env.DISCORD_OWNER_ROLE_ID,
  ticketDeleteDelay: 15000,
  skipVouchDeleteDelay: 10000,
  maxContextMessages: 15,
}

const requiredEnvVars = [
  "DISCORD_TOKEN",
  "DISCORD_CLIENT_ID",
  "DISCORD_GUILD_ID",
  "DISCORD_CHANNEL_ID",
  "DISCORD_WEBHOOK_URL",
  "DISCORD_VOUCH_WEBHOOK_URL",
  "DISCORD_VOUCH_CHANNEL_ID",
  "DISCORD_TICKET_CATEGORY_ID",
  "DISCORD_SUPPORT_ROLE_ID",
  "DISCORD_OWNER_ROLE_ID",
]

const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName])

if (missingEnvVars.length > 0) {
  console.error("❌ Missing required environment variables:")
  missingEnvVars.forEach((varName) => console.error(`   - ${varName}`))
  console.error("\nPlease set these environment variables before starting the bot.")
  process.exit(1)
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
})

const supportCategories = {
  customer_support: {
    label: "Customer Support",
    description: "General inquiries and account assistance",
    style: ButtonStyle.Primary,
    emoji: "💬",
    priority: "normal",
  },
  software_setup: {
    label: "Software Setup",
    description: "Installation and configuration support",
    style: ButtonStyle.Secondary,
    emoji: "⚙️",
    priority: "normal",
  },
  hardware_reset: {
    label: "Hardware Reset",
    description: "Hardware ID and system reset requests",
    style: ButtonStyle.Danger,
    emoji: "🔄",
    priority: "high",
  },
  payment_issues: {
    label: "Payment Issues",
    description: "Billing, refunds, and payment support",
    style: ButtonStyle.Success,
    emoji: "💳",
    priority: "high",
  },
  reselling: {
    label: "Reselling",
    description: "Partnership opportunities and reseller info",
    style: ButtonStyle.Secondary,
    emoji: "🤝",
    priority: "normal",
  },
}

const ticketData = new Map()
const vouchSystem = new Map()
const aiChatContext = new Map()
const usedTicketIds = new Set()
const activeTickets = new Map()

function createSupportEmbed() {
  const embed = new EmbedBuilder()
    .setTitle("Response Support")
    .setDescription("Select your support category below to get started")
    .setColor(0x2f3136)
    .setFooter({ text: "Response Support • Professional Assistance" })
    .setTimestamp()

  return embed
}

function createSupportButtons() {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("support_category_select")
    .setPlaceholder("Choose your support category...")
    .setMinValues(1)
    .setMaxValues(1)

  Object.entries(supportCategories).forEach(([key, category]) => {
    const option = new StringSelectMenuOptionBuilder()
      .setLabel(category.label)
      .setDescription(category.description)
      .setValue(key)
      .setEmoji(category.emoji)

    selectMenu.addOptions(option)
  })

  const row1 = new ActionRowBuilder().addComponents(selectMenu)
  return [row1]
}

function generateTicketId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = ""
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function getUniqueTicketId() {
  let ticketId
  let attempts = 0
  const maxAttempts = 100

  do {
    ticketId = generateTicketId()
    attempts++
    if (attempts > maxAttempts) {
      throw new Error("Unable to generate unique ticket ID after maximum attempts")
    }
  } while (usedTicketIds.has(ticketId))

  usedTicketIds.add(ticketId)
  return ticketId
}

async function createTicketChannel(guild, user, category) {
  try {
    const ticketId = getUniqueTicketId()
    const channelName = `ticket-${ticketId.toLowerCase()}`

    const existingTicket = Array.from(activeTickets.values()).find(
      (ticket) => ticket.userId === user.id && ticket.status === "open",
    )
    if (existingTicket) {
      return { error: "You already have an active ticket open!" }
    }

    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: config.ticketCategoryId,
      permissionOverwrites: [
        {
          id: guild.roles.everyone,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
          ],
        },
        {
          id: config.supportRoleId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.AttachFiles,
          ],
        },
        {
          id: config.ownerRoleId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.AttachFiles,
          ],
        },
      ],
    })

    const ticketInfo = {
      id: ticketId,
      userId: user.id,
      username: user.username,
      category: category.label,
      priority: category.priority,
      createdAt: new Date(),
      channelId: channel.id,
      status: "open",
      vouchSubmitted: false,
      lastActivity: new Date(),
      staffNotified: false,
    }

    ticketData.set(ticketId, ticketInfo)
    activeTickets.set(channel.id, ticketInfo)

    const welcomeEmbed = new EmbedBuilder()
      .setTitle(`${category.label} Support`)
      .setDescription(
        `Welcome ${user}!\n\n` +
          `Your private support channel is now active.\n` +
          `Our team will assist you shortly.\n\n` +
          `**Ticket Information**\n` +
          `• ID: \`${ticketId}\`\n` +
          `• Category: ${category.label}\n` +
          `• Priority: ${category.priority.toUpperCase()}\n` +
          `• Status: Active\n\n` +
          `Type \`!response [question]\` for instant assistance.`,
      )
      .setColor(category.priority === "high" ? 0xff6b35 : 0x5865f2)
      .setThumbnail(user.displayAvatarURL())
      .setFooter({ text: `Ticket ${ticketId} • Response Support` })
      .setTimestamp()

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`close_ticket_${user.id}_${ticketId}`)
        .setLabel("Close Ticket")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`priority_ticket_${user.id}_${ticketId}`)
        .setLabel("Mark Priority")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`notify_staff_${user.id}_${ticketId}`)
        .setLabel("Notify Staff")
        .setStyle(ButtonStyle.Success),
    )

    await channel.send({
      content: `${user}`,
      embeds: [welcomeEmbed],
      components: [actionRow],
    })

    return { channel, ticketId }
  } catch (error) {
    console.error("Failed to create ticket channel:", error)
    return { error: "Failed to create ticket channel. Please try again." }
  }
}

function createVouchModal(ticketId) {
  const modal = new ModalBuilder().setCustomId(`vouch_modal_${ticketId}`).setTitle("Rate Your Experience")

  const ratingInput = new TextInputBuilder()
    .setCustomId("vouch_rating")
    .setLabel("Rate your experience (1-5)")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("5")
    .setRequired(true)
    .setMinLength(1)
    .setMaxLength(1)

  const feedbackInput = new TextInputBuilder()
    .setCustomId("vouch_feedback")
    .setLabel("Your feedback")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder("Tell us about your experience...")
    .setRequired(true)
    .setMinLength(10)
    .setMaxLength(1000)

  const publicInput = new TextInputBuilder()
    .setCustomId("vouch_public")
    .setLabel("Make this review public? (yes/no)")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("yes")
    .setRequired(false)
    .setMaxLength(3)

  const anonymousInput = new TextInputBuilder()
    .setCustomId("vouch_anonymous")
    .setLabel("Submit anonymously? (yes/no)")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("no")
    .setRequired(false)
    .setMaxLength(3)

  const imageInput = new TextInputBuilder()
    .setCustomId("vouch_image")
    .setLabel("Image URL (optional)")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("https://example.com/image.png")
    .setRequired(false)
    .setMaxLength(500)

  const firstActionRow = new ActionRowBuilder().addComponents(ratingInput)
  const secondActionRow = new ActionRowBuilder().addComponents(feedbackInput)
  const thirdActionRow = new ActionRowBuilder().addComponents(publicInput)
  const fourthActionRow = new ActionRowBuilder().addComponents(anonymousInput)
  const fifthActionRow = new ActionRowBuilder().addComponents(imageInput)

  modal.addComponents(firstActionRow, secondActionRow, thirdActionRow, fourthActionRow, fifthActionRow)
  return modal
}

function createVouchOrCloseButtons(ticketId, userId) {
  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`submit_vouch_${userId}_${ticketId}`)
      .setLabel("Submit Review")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`skip_vouch_${userId}_${ticketId}`)
      .setLabel("Skip Review")
      .setStyle(ButtonStyle.Secondary),
  )

  return actionRow
}

function generateSmartResponse(userId, message, channelId) {
  if (!aiChatContext.has(userId)) {
    aiChatContext.set(userId, {
      conversations: [],
      preferences: {},
      commonIssues: [],
      lastInteraction: new Date(),
    })
  }

  const userContext = aiChatContext.get(userId)
  userContext.conversations.push({ message, timestamp: new Date(), channelId })
  userContext.lastInteraction = new Date()

  if (userContext.conversations.length > config.maxContextMessages) {
    userContext.conversations = userContext.conversations.slice(-config.maxContextMessages)
  }

  const lowerMessage = message.toLowerCase()

  if (lowerMessage.includes("password") || lowerMessage.includes("login") || lowerMessage.includes("account")) {
    userContext.commonIssues.push("authentication")
    return {
      title: "Authentication Support",
      description:
        "Let me help with login issues! Try these solutions:\n\n• Reset your password using the recovery link\n• Clear browser cache and cookies\n• Try incognito/private browsing mode\n• Verify caps lock is disabled\n• Check for typos in username/email\n\nIf these don't work, our team will assist you further!",
      color: 0x3498db,
    }
  }

  if (lowerMessage.includes("install") || lowerMessage.includes("setup") || lowerMessage.includes("download")) {
    userContext.commonIssues.push("installation")
    return {
      title: "Installation Support",
      description:
        "Having setup troubles? Here are proven solutions:\n\n• Run installer as administrator\n• Temporarily disable antivirus\n• Check system requirements\n• Download from official source only\n• Ensure sufficient disk space\n\nOur system is learning your patterns for better help!",
      color: 0x9b59b6,
    }
  }

  if (lowerMessage.includes("payment") || lowerMessage.includes("billing") || lowerMessage.includes("charge")) {
    userContext.commonIssues.push("billing")
    return {
      title: "Payment Support",
      description:
        "Payment issues resolved quickly! Common fixes:\n\n• Verify sufficient account balance\n• Confirm billing address accuracy\n• Try alternative payment method\n• Check for international transaction blocks\n• Contact your bank if needed\n\nOur team can verify payment status instantly!",
      color: 0x27ae60,
    }
  }

  if (lowerMessage.includes("bug") || lowerMessage.includes("error") || lowerMessage.includes("crash")) {
    userContext.commonIssues.push("technical")
    return {
      title: "Technical Support",
      description:
        "Technical issues detected! Let's troubleshoot:\n\n• Restart the application completely\n• Update to latest version\n• Check error logs or screenshots\n• Run in compatibility mode\n• Clear temporary files\n\nOur system gets smarter with each interaction!",
      color: 0xe74c3c,
    }
  }

  return {
    title: "Response Assistant",
    description: `I'm here to help! I've analyzed ${userContext.conversations.length} of our conversations.\n\n**What I can assist with:**\n• Login and authentication\n• Installation problems\n• Payment questions\n• Technical troubleshooting\n• General support\n\n**Smart Features:**\n• Conversation memory\n• Pattern recognition\n• Adaptive responses\n\nAsk me anything, or our elite team will help!`,
    color: 0x00d4ff,
  }
}

function logError(context, error) {
  console.error(`[${context}] Error:`, error)
}

client.once("ready", async () => {
  console.log(`🚀 Response bot is online as ${client.user.tag}!`)

  try {
    const channel = await client.channels.fetch(config.channelId)
    if (channel) {
      const embed = createSupportEmbed()
      const buttons = createSupportButtons()

      await channel.send({
        embeds: [embed],
        components: buttons,
      })

      console.log("✅ Modern support system deployed successfully!")
    }
  } catch (error) {
    logError("Bot Ready", error)
  }
})

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.type === InteractionType.MessageComponent) {
      if (interaction.isStringSelectMenu() && interaction.customId === "support_category_select") {
        const categoryKey = interaction.values[0]
        const category = supportCategories[categoryKey]

        if (!category) {
          await interaction.reply({ content: "Unknown support category!", ephemeral: true })
          return
        }

        const result = await createTicketChannel(interaction.guild, interaction.user, category)

        if (result.error) {
          await interaction.reply({
            content: result.error,
            ephemeral: true,
          })
          return
        }

        const { channel, ticketId } = result

        const responseEmbed = new EmbedBuilder()
          .setTitle("Ticket Created")
          .setDescription(
            `Your private support channel is live!\n\n` +
              `Channel: ${channel}\n` +
              `Category: ${category.label}\n` +
              `Ticket ID: \`${ticketId}\`\n\n` +
              `Type \`!response [question]\` for assistance`,
          )
          .setColor(0x5865f2)
          .setFooter({ text: `Ticket ${ticketId} • Response Support` })

        await interaction.reply({
          embeds: [responseEmbed],
          ephemeral: true,
        })
      } else if (interaction.customId.startsWith("close_ticket_")) {
        const parts = interaction.customId.split("_")
        const userId = parts[2]
        const ticketId = parts[3]

        if (interaction.user.id !== userId && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          await interaction.reply({ content: "You can only close your own tickets!", ephemeral: true })
          return
        }

        const vouchOrCloseEmbed = new EmbedBuilder()
          .setTitle("Ticket Closure")
          .setDescription(
            "Before closing your ticket, would you like to leave a review?\n\n" +
              "Your feedback helps us improve our support quality.\n" +
              "You can also skip this step if you prefer.",
          )
          .setColor(0xffa500)
          .setFooter({ text: `Ticket ${ticketId} • Response Support` })

        const vouchButtons = createVouchOrCloseButtons(ticketId, userId)

        await interaction.reply({
          embeds: [vouchOrCloseEmbed],
          components: [vouchButtons],
          ephemeral: true,
        })
      } else if (interaction.customId.startsWith("submit_vouch_")) {
        const parts = interaction.customId.split("_")
        const userId = parts[2]
        const ticketId = parts[3]

        if (interaction.user.id !== userId) {
          await interaction.reply({ content: "You can only submit reviews for your own tickets!", ephemeral: true })
          return
        }

        const vouchModal = createVouchModal(ticketId)
        await interaction.showModal(vouchModal)
      } else if (interaction.customId.startsWith("skip_vouch_")) {
        const parts = interaction.customId.split("_")
        const userId = parts[2]
        const ticketId = parts[3]

        if (interaction.user.id !== userId) {
          await interaction.reply({ content: "You can only close your own tickets!", ephemeral: true })
          return
        }

        const ticketInfo = ticketData.get(ticketId)
        if (ticketInfo) {
          ticketInfo.status = "closed"
          ticketInfo.vouchSubmitted = false
          activeTickets.delete(interaction.channel.id)
        }

        const closeEmbed = new EmbedBuilder()
          .setTitle("Ticket Closed")
          .setDescription(
            `Thank you for using Response Support!\n\n` +
              `Ticket \`${ticketId}\` has been closed.\n` +
              `This channel will be deleted in 10 seconds.`,
          )
          .setColor(0x95a5a6)
          .setFooter({ text: `Ticket ${ticketId} • Response Support` })
          .setTimestamp()

        await interaction.reply({ embeds: [closeEmbed] })

        setTimeout(async () => {
          try {
            await interaction.channel.delete()
          } catch (error) {
            logError("Channel Delete", error)
          }
        }, config.skipVouchDeleteDelay)
      } else if (interaction.customId.startsWith("priority_ticket_")) {
        const parts = interaction.customId.split("_")
        const userId = parts[2]
        const ticketId = parts[3]

        if (interaction.user.id !== userId) {
          await interaction.reply({ content: "You can only modify your own tickets!", ephemeral: true })
          return
        }

        const priorityEmbed = new EmbedBuilder()
          .setTitle("Priority Status Updated")
          .setDescription("Your ticket has been marked as priority!\n\nOur team will respond faster now!")
          .setColor(0xff6b35)
          .setFooter({ text: "Response Support" })

        await interaction.reply({ embeds: [priorityEmbed], ephemeral: true })
      } else if (interaction.customId.startsWith("notify_staff_")) {
        const parts = interaction.customId.split("_")
        const userId = parts[2]
        const ticketId = parts[3]

        if (interaction.user.id !== userId) {
          await interaction.reply({ content: "You can only notify staff for your own tickets!", ephemeral: true })
          return
        }

        const ticketInfo = ticketData.get(ticketId)
        if (ticketInfo) {
          ticketInfo.staffNotified = true
        }

        const notifyEmbed = new EmbedBuilder()
          .setTitle("Staff Notification Sent")
          .setDescription("All available staff have been notified!\n\nSomeone will be with you very soon!")
          .setColor(0x7289da)
          .setFooter({ text: "Response Support" })

        await interaction.channel.send({
          content: `<@&${config.supportRoleId}> - Staff assistance requested in this ticket!`,
          embeds: [notifyEmbed],
        })

        await interaction.reply({
          content: "Staff have been notified and will respond shortly!",
          ephemeral: true,
        })
      }
    } else if (interaction.type === InteractionType.ModalSubmit) {
      if (interaction.customId.startsWith("vouch_modal_")) {
        const ticketId = interaction.customId.split("_")[2]
        const rating = Number.parseInt(interaction.fields.getTextInputValue("vouch_rating"))
        const feedback = interaction.fields.getTextInputValue("vouch_feedback")
        const isPublic = interaction.fields.getTextInputValue("vouch_public")?.toLowerCase() === "yes"
        const isAnonymous = interaction.fields.getTextInputValue("vouch_anonymous")?.toLowerCase() === "yes"
        const imageUrl = interaction.fields.getTextInputValue("vouch_image")?.trim() || null

        if (rating < 1 || rating > 5) {
          await interaction.reply({ content: "Rating must be between 1 and 5!", ephemeral: true })
          return
        }

        let validImageUrl = null
        if (imageUrl) {
          try {
            const url = new URL(imageUrl)
            if (url.protocol === "http:" || url.protocol === "https:") {
              validImageUrl = imageUrl
            }
          } catch (error) {
            await interaction.reply({
              content: "Invalid image URL provided. Please use a valid HTTP/HTTPS URL.",
              ephemeral: true,
            })
            return
          }
        }

        const vouchId = `vouch_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
        const vouchData = {
          id: vouchId,
          ticketId,
          userId: interaction.user.id,
          username: isAnonymous ? "Anonymous User" : interaction.user.username,
          rating,
          feedback,
          isPublic,
          isAnonymous,
          imageUrl: validImageUrl,
          createdAt: new Date(),
        }

        vouchSystem.set(vouchId, vouchData)

        const ticketInfo = ticketData.get(ticketId)
        if (ticketInfo) {
          ticketInfo.status = "closed"
          ticketInfo.vouchSubmitted = true
          activeTickets.delete(interaction.channel.id)
        }

        const vouchEmbed = new EmbedBuilder()
          .setTitle("Review Submitted Successfully")
          .setDescription(
            `Thank you for your valuable feedback!\n\n` +
              `**Your Review:**\n` +
              `Rating: ${rating}/5 ${"⭐".repeat(rating)}\n` +
              `Feedback: ${feedback}\n` +
              `Public: ${isPublic ? "Yes" : "No"}\n` +
              `Anonymous: ${isAnonymous ? "Yes" : "No"}\n` +
              `${validImageUrl ? `Image: Attached\n` : ""}` +
              `\nYour ticket will now be closed.`,
          )
          .setColor(0x00ff00)
          .setFooter({ text: `Review ID: ${vouchId} • Ticket ${ticketId}` })
          .setTimestamp()

        if (validImageUrl) {
          vouchEmbed.setImage(validImageUrl)
        }

        await interaction.reply({
          embeds: [vouchEmbed],
          ephemeral: true,
        })

        if (isPublic) {
          try {
            const publicVouchEmbed = new EmbedBuilder()
              .setTitle("New Customer Review")
              .setDescription(
                `**Rating:** ${rating}/5 ${"⭐".repeat(rating)}\n\n` +
                  `**Review:** ${feedback}\n\n` +
                  `**Customer:** ${isAnonymous ? "Anonymous" : interaction.user.username}\n` +
                  `**Ticket:** ${ticketId}`,
              )
              .setColor(0xffd700)
              .setTimestamp()
              .setFooter({ text: `Review ID: ${vouchId}` })

            if (validImageUrl) {
              publicVouchEmbed.setImage(validImageUrl)
            }

            await fetch(config.vouchWebhookUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                embeds: [publicVouchEmbed.toJSON()],
              }),
            })
          } catch (error) {
            logError("Vouch Webhook", error)
          }
        }

        setTimeout(async () => {
          try {
            await interaction.channel.delete()
          } catch (error) {
            logError("Channel Delete", error)
          }
        }, config.ticketDeleteDelay)
      }
    }
  } catch (error) {
    logError("Interaction Handler", error)

    if (!interaction.replied && !interaction.deferred) {
      await interaction
        .reply({
          content: "An error occurred while processing your request. Please try again later.",
          ephemeral: true,
        })
        .catch(() => {})
    }
  }
})

client.on("messageCreate", async (message) => {
  if (message.author.bot) return

  try {
    if (message.content.startsWith("!response")) {
      const query = message.content.slice(9).trim()

      if (!query) {
        const helpEmbed = new EmbedBuilder()
          .setTitle("Response Assistant Help")
          .setDescription(
            `How to use the Response Assistant:\n\n` +
              `\`!response [your question]\` - Ask me anything!\n\n` +
              `Examples:\n` +
              `• \`!response I can't login to my account\`\n` +
              `• \`!response How do I install the software?\`\n` +
              `• \`!response I need help with payment issues\`\n` +
              `• \`!response My application keeps crashing\`\n\n` +
              `Advanced learning system for personalized help!`,
          )
          .setColor(0x00d4ff)
          .setFooter({ text: "Response Assistant" })

        await message.reply({ embeds: [helpEmbed] })
        return
      }

      const smartResponse = generateSmartResponse(message.author.id, query, message.channel.id)

      const responseEmbed = new EmbedBuilder()
        .setTitle(smartResponse.title)
        .setDescription(smartResponse.description)
        .setColor(smartResponse.color)
        .setFooter({ text: "Response Assistant" })

      await message.reply({ embeds: [responseEmbed] })
      return
    }

    if (message.content === "!support" && message.member.permissions.has("ADMINISTRATOR")) {
      const embed = createSupportEmbed()
      const buttons = createSupportButtons()

      await message.channel.send({
        embeds: [embed],
        components: buttons,
      })

      await message.delete().catch(() => {})
    }

    if (message.content === "!botinfo") {
      const infoEmbed = new EmbedBuilder()
        .setTitle("Response Bot Information")
        .setDescription("Ultra-modern Discord support system with smart assistant")
        .addFields(
          { name: "Uptime", value: `<t:${Math.floor((Date.now() - client.uptime) / 1000)}:R>`, inline: true },
          { name: "Active Tickets", value: activeTickets.size.toString(), inline: true },
          { name: "Total Reviews", value: vouchSystem.size.toString(), inline: true },
        )
        .setColor(0x00d4ff)
        .setFooter({ text: "Response Support • Professional Service" })

      await message.reply({ embeds: [infoEmbed] })
    }
  } catch (error) {
    logError("Message Handler", error)
  }
})

console.log("🚀 Starting Response Discord Bot...")
client.login(config.token).catch((error) => {
  logError("Bot Login", error)
  process.exit(1)
})

process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down Response bot...")
  client.destroy()
  process.exit(0)
})

process.on("SIGTERM", () => {
  console.log("\n🛑 Shutting down Response bot...")
  client.destroy()
  process.exit(0)
})

process.on("unhandledRejection", (error) => {
  logError("Unhandled Rejection", error)
})

process.on("uncaughtException", (error) => {
  logError("Uncaught Exception", error)
  process.exit(1)
})
