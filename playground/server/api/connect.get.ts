export default defineEventHandler(async () => {
  const db = useDbConnector()
  const token = ''
  const data = await db.get('roly_config', { select: `
    phone_contact
    email_contact
    social_net
` }, token)
  return data
})
